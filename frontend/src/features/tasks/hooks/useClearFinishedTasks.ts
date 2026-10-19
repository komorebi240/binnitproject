import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/useI18n";
import { useHideTasks, useUnhideTasks } from "./useTasks";

/** How long "Undo" stays offered after a "Clear all". */
export const UNDO_WINDOW_MS = 15_000;
/** Mirrors the server's limit per request (TaskIdsRequest). */
const BATCH_SIZE = 500;

function batches(ids: number[]): number[][] {
  const result: number[][] = [];
  for (let start = 0; start < ids.length; start += BATCH_SIZE) result.push(ids.slice(start, start + BATCH_SIZE));
  return result;
}

/**
 * "Clear all" under Completed / Cancelled, with its undo: the cleared tasks disappear from the user's own lists only
 * (the server keeps them, other people still see them, statistics still count them). The ids the server actually hid
 * are kept for a while so "Undo" can bring exactly those back.
 */
export function useClearFinishedTasks() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const hide = useHideTasks();
  const unhide = useUnhideTasks();
  const [cleared, setCleared] = useState<number[] | null>(null);

  useEffect(() => {
    if (!cleared) return undefined;
    const timer = setTimeout(() => setCleared(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [cleared]);

  async function clear(taskIds: number[]) {
    if (taskIds.length === 0) return;
    try {
      const hidden: number[] = [];
      for (const batch of batches(taskIds)) {
        hidden.push(...(await hide.mutateAsync(batch)));
      }
      setCleared(hidden.length > 0 ? hidden : null);
    } catch {
      showToast("error", t("tasks.clearFinished.couldNotClear"));
    }
  }

  async function undo() {
    if (!cleared) return;
    try {
      for (const batch of batches(cleared)) {
        await unhide.mutateAsync(batch);
      }
      setCleared(null);
    } catch {
      showToast("error", t("tasks.clearFinished.couldNotUndo"));
    }
  }

  return { clear, undo, cleared, dismiss: () => setCleared(null), clearing: hide.isPending, undoing: unhide.isPending };
}
