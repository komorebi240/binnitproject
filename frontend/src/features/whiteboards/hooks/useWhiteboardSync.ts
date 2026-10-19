import { CaptureUpdateAction, reconcileElements, restoreElements } from "@excalidraw/excalidraw";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/api/client";
import * as api from "../api/whiteboardApi";
import { hasUnsyncedChanges, syncableElements, versionsOf } from "../sceneSync";
import type { StoredElement, WhiteboardDetail } from "../types";
import { useWhiteboardVersion } from "./useWhiteboards";

/** "gone": the board was deleted, or the user lost (edit) access while it was open; nothing more is saved or polled. */
export type SyncStatus = "saved" | "unsaved" | "saving" | "error" | "gone";

/** A first unsaved change is saved this long after it happens; changes made meanwhile go in the same save. */
const SAVE_DELAY_MS = 1_000;
/** After a failed save (network, server), the next attempt waits this long unless the user changes something again. */
const RETRY_DELAY_MS = 10_000;
/** Someone else saving between our merge and our save again; after this many rounds the next change tries again. */
const MAX_CONFLICT_ROUNDS = 3;

function isAccessLost(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.status === 403 || err.status === 404);
}

interface Options {
  board: WhiteboardDetail;
  editable: boolean;
  /** The board is on screen (its tab is visible); polling stops otherwise. */
  shown: boolean;
  onSaveFailed: (err: unknown) => void;
}

/**
 * Keeps one open board in step with the server and with everyone else who has it open:
 * <ul>
 *   <li>a change on the canvas is saved about a second later, naming the version it started from;</li>
 *   <li>while the board is on screen, its version is polled every few seconds; when someone else saved, their drawing is
 *       merged into ours element by element (Excalidraw's own rule: the newer version of each element wins, and what the
 *       user is drawing right now is never taken away);</li>
 *   <li>if a save is refused because someone saved first (409), the same merge runs and the save is tried again.</li>
 * </ul>
 * Nothing is overwritten blindly, so two people drawing at once both keep their work.
 */
export function useWhiteboardSync({ board, editable, shown, onSaveFailed }: Options) {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const baseVersion = useRef(board.version);
  const synced = useRef(versionsOf(board.scene.elements));
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveFailedRef = useRef(onSaveFailed);
  onSaveFailedRef.current = onSaveFailed;
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [lastEditor, setLastEditor] = useState<string | null>(board.updatedByName);
  const gone = status === "gone";
  const lost = useRef(false);

  const saveRef = useRef<() => Promise<void>>(async () => undefined);

  const { data: remoteVersion, dataUpdatedAt, error: pollError } = useWhiteboardVersion(board.id, shown && !gone);

  const merge = useCallback(async () => {
    const remote = await api.getWhiteboard(board.id);
    const excalidraw = excalidrawRef.current;
    if (!excalidraw) return;
    const remoteElements = restoreElements(
      remote.scene.elements as unknown as Parameters<typeof restoreElements>[0],
      null,
    ) as unknown as RemoteExcalidrawElement[];
    const merged = reconcileElements(excalidraw.getSceneElementsIncludingDeleted(), remoteElements, excalidraw.getAppState());
    baseVersion.current = remote.version;
    synced.current = versionsOf(remote.scene.elements);
    setLastEditor(remote.updatedByName);
    // Someone else's drawing is not part of this user's undo history.
    excalidraw.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
  }, [board.id]);

  const schedule = useCallback((delay: number) => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveRef.current();
    }, delay);
  }, []);

  const save = useCallback(async () => {
    const excalidraw = excalidrawRef.current;
    if (!excalidraw || !editable || lost.current) return;
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    saving.current = true;
    setStatus("saving");
    try {
      for (let round = 0; round < MAX_CONFLICT_ROUNDS; round++) {
        const now = Date.now();
        const elements = syncableElements(excalidraw.getSceneElementsIncludingDeleted() as unknown as StoredElement[], now);
        if (!hasUnsyncedChanges(elements, synced.current, now)) break;
        // A copy, so what is recorded as saved is exactly what was sent even if the canvas changes while it travels.
        const snapshot = structuredClone(elements);
        try {
          const result = await api.saveWhiteboardScene(board.id, baseVersion.current, snapshot);
          baseVersion.current = result.version;
          synced.current = versionsOf(snapshot);
          setLastEditor(result.updatedByName);
          break;
        } catch (err) {
          if (err instanceof ApiRequestError && err.code === "WHITEBOARD_CONFLICT") {
            await merge();
            continue;
          }
          throw err;
        }
      }
      const now = Date.now();
      const elements = excalidraw.getSceneElementsIncludingDeleted() as unknown as StoredElement[];
      setStatus(hasUnsyncedChanges(elements, synced.current, now) ? "unsaved" : "saved");
    } catch (err) {
      onSaveFailedRef.current(err);
      if (isAccessLost(err)) {
        lost.current = true;
        setStatus("gone");
        return;
      }
      setStatus("error");
      schedule(RETRY_DELAY_MS);
    } finally {
      saving.current = false;
      if (saveAgain.current) {
        saveAgain.current = false;
        schedule(SAVE_DELAY_MS);
      }
    }
  }, [board.id, editable, merge, schedule]);
  saveRef.current = save;

  /** Excalidraw's onChange: runs on every pointer move and selection too, so it only compares versions. */
  const handleChange = useCallback(
    (elements: readonly unknown[]) => {
      if (!editable || gone) return;
      if (hasUnsyncedChanges(elements as StoredElement[], synced.current, Date.now())) {
        setStatus((current) => (current === "saving" || current === "error" ? current : "unsaved"));
        schedule(SAVE_DELAY_MS);
      }
    },
    [editable, gone, schedule],
  );

  // Deleted, or no longer shared with this user: stop instead of polling and failing forever.
  useEffect(() => {
    if (isAccessLost(pollError)) {
      lost.current = true;
      setStatus("gone");
    }
  }, [pollError]);

  // Someone else saved: merge their drawing in, unless our own save is on its way (it will meet the conflict and merge).
  // dataUpdatedAt makes every poll count, so a merge that failed is tried again at the next one.
  useEffect(() => {
    if (!remoteVersion || remoteVersion.version <= baseVersion.current || saving.current) return;
    merge().catch(() => {
      // Tried again at the next poll; the canvas keeps the user's drawing meanwhile.
    });
  }, [remoteVersion, dataUpdatedAt, merge]);

  // Leaving the board (closing its tab) sends what is still unsaved.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void saveRef.current();
      }
    },
    [],
  );

  return { excalidrawRef, status, lastEditor, handleChange };
}
