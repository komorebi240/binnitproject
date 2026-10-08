"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { FloatingWindow } from "@/components/ui/FloatingWindow";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import {
  clampGeometry,
  defaultGeometry,
  growToFitContent,
  parseStoredWindow,
  serializeStoredWindow,
  type StoredWindow,
  type WindowGeometry,
  type WindowLimits,
} from "@/lib/floatingWindow";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useNotes, useSetNotePinned, useUpdateNote } from "../hooks/useNotes";
import type { Note } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const LIMITS: WindowLimits = { minWidth: 220, minHeight: 140, margin: 8 };
const STORAGE_PREFIX = "pinned-note-window:";
const BASE_Z_INDEX = 40;
const PERSIST_DELAY_MS = 250;
const AUTOSAVE_DELAY_MS = 1200;
/** Spare pixels added when growing so the caret line is never flush against the bottom edge. */
const GROW_BUFFER_PX = 2;

function currentViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

interface PinnedNoteWindowProps {
  note: Note;
  index: number;
  userId: number;
  zIndex: number;
  onActivate: () => void;
}

/**
 * One pinned note as a floating window. Its text area fills the window; when typing fills it, the
 * window grows by exactly the overflow (up to 70% of the screen height, moving up if it would
 * otherwise spill past the bottom edge, then it scrolls). Size, position and collapsed state are
 * remembered per account and per note, so re-pinning a note brings its window back as it was.
 * Text is saved shortly after typing stops and when the text area loses focus.
 */
function PinnedNoteWindow({ note, index, userId, zIndex, onActivate }: PinnedNoteWindowProps) {
  const { t } = useI18n();
  const updateNote = useUpdateNote();
  const setPinned = useSetNotePinned();
  const { showToast } = useToast();
  const storageKey = `${STORAGE_PREFIX}${userId}:${note.id}`;

  const [geometry, setGeometry] = useState<WindowGeometry | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState(note.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedRef = useRef(note.content ?? "");
  const hadStoredWindowRef = useRef(false);
  const indexRef = useRef(index); // only the initial slot matters, later unpins must not move windows
  const ready = geometry !== null;

  // Restore the remembered window (clamped to today's screen) or open a fresh one.
  useEffect(() => {
    const viewport = currentViewport();
    let stored: StoredWindow | null = null;
    try {
      stored = parseStoredWindow(window.localStorage.getItem(storageKey));
    } catch {
      // Blocked storage: behave as if nothing was remembered.
    }
    hadStoredWindowRef.current = stored !== null;
    setGeometry(
      clampGeometry(
        stored?.geometry ?? defaultGeometry(indexRef.current, viewport, LIMITS),
        viewport,
        LIMITS,
      ),
    );
    setCollapsed(stored?.collapsed ?? false);
  }, [storageKey]);

  // Remember the window once it stops moving.
  useEffect(() => {
    if (!geometry) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, serializeStoredWindow({ geometry, collapsed }));
      } catch {
        // Nothing else to do if storage is unavailable.
      }
    }, PERSIST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [geometry, collapsed, storageKey]);

  /** Grows the window by however much the text overflows its text area (no-op when it fits). */
  const growIfOverflowing = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const overflow = textarea.scrollHeight - textarea.clientHeight;
    if (overflow <= 1) return;
    setGeometry((current) =>
      current
        ? growToFitContent(current, overflow + GROW_BUFFER_PX, currentViewport(), LIMITS)
        : current,
    );
  }, []);

  // A window opened for the first time fits its note; a remembered one keeps the size the user chose.
  useLayoutEffect(() => {
    if (ready && !hadStoredWindowRef.current) growIfOverflowing();
  }, [ready, growIfOverflowing]);

  // Typing: expand as soon as the text reaches the bottom of the visible area.
  useLayoutEffect(() => {
    if (ready && !collapsed) growIfOverflowing();
    // Only typing should trigger growth: re-running on geometry changes would undo the user shrinking the window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const save = useCallback(
    (next: string) => {
      const previous = lastSavedRef.current;
      lastSavedRef.current = next;
      updateNote.mutate(
        { id: note.id, input: { title: note.title, content: next } },
        {
          onError: (err) => {
            lastSavedRef.current = previous; // let the next change retry
            showToast(
              "error",
              err instanceof ApiRequestError ? err.message : t("notes.noteModal.couldnTSaveTheNote"),
            );
          },
        },
      );
    },
    [note.id, note.title, updateNote, showToast, t],
  );

  useEffect(() => {
    if (text === lastSavedRef.current) return;
    const timer = window.setTimeout(() => save(text), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, save]);

  // Pick up edits made elsewhere (e.g. in Note của tôi) unless the user is typing here right now.
  useEffect(() => {
    const incoming = note.content ?? "";
    if (incoming !== lastSavedRef.current && document.activeElement !== textareaRef.current) {
      lastSavedRef.current = incoming;
      setText(incoming);
    }
  }, [note.content]);

  if (!geometry) return null;

  return (
    <FloatingWindow
      title={note.title}
      geometry={geometry}
      collapsed={collapsed}
      limits={LIMITS}
      zIndex={zIndex}
      onGeometryChange={setGeometry}
      onCollapsedChange={setCollapsed}
      onActivate={onActivate}
      headerActions={
        <button
          type="button"
          title={t("notes.notesPanel.unpin")}
          aria-label={t("notes.notesPanel.unpin")}
          onClick={() => setPinned.mutate({ id: note.id, pinned: false })}
          className="flex h-6 w-6 items-center justify-center rounded text-fg-faint hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X size={14} aria-hidden />
        </button>
      }
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text !== lastSavedRef.current) save(text);
        }}
        aria-label={t("notes.pinnedNoteWidget.contentOfNoteTitle", { title: note.title })}
        placeholder={t("notes.pinnedNoteWidget.writeANote")}
        className="min-h-0 flex-1 resize-none rounded border border-line bg-transparent px-2 py-1.5 text-sm text-fg-soft transition-colors duration-150 hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
    </FloatingWindow>
  );
}

/**
 * "Always on display" for pinned notes - mounted once in dashboard/layout.tsx. Every pinned note is
 * its own floating window (draggable, resizable, auto-growing); the one you touched last is on top.
 */
export function PinnedNoteWidget() {
  const { data: currentUser } = useCurrentUser();
  const { data: notes } = useNotes();
  const [frontNoteId, setFrontNoteId] = useState<number | null>(null);

  const pinnedNotes = (notes ?? []).filter((n) => n.pinned);
  if (!currentUser || pinnedNotes.length === 0) return null;

  return (
    <>
      {pinnedNotes.map((note, index) => (
        <PinnedNoteWindow
          key={note.id}
          note={note}
          index={index}
          userId={currentUser.userId}
          zIndex={BASE_Z_INDEX + (note.id === frontNoteId ? 1 : 0)}
          onActivate={() => setFrontNoteId(note.id)}
        />
      ))}
    </>
  );
}
