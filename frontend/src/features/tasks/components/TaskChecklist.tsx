"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import {
  useAddChecklistItem,
  useRemoveChecklistItem,
  useSetChecklistItemDone,
} from "../hooks/useTasks";
import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_TEXT, type Task } from "../types";

/** "2/5" style summary for cards; null when the task has no checklist. */
export function ChecklistProgress({ task }: { task: Pick<Task, "checklist"> }) {
  const total = task.checklist.length;
  if (total === 0) return null;
  const done = task.checklist.filter((item) => item.done).length;
  return (
    <span
      className={`inline-flex items-center gap-1 ${done === total ? "text-success" : ""}`}
      title="Tiến độ checklist"
    >
      <span aria-hidden>&#9745;</span>
      {done}/{total}
    </span>
  );
}

/**
 * The checklist of one task inside the detail window. Ticking the last open item completes the task
 * (the server does that), so it only unlocks once the task has been accepted. Only people who can
 * manage the task may change it; everyone who can see the task sees the progress.
 */
export function TaskChecklist({ task }: { task: Task }) {
  const addItem = useAddChecklistItem();
  const setDone = useSetChecklistItemDone();
  const removeItem = useRemoveChecklistItem();
  const { showToast } = useToast();
  const [draft, setDraft] = useState("");

  const total = task.checklist.length;
  const done = task.checklist.filter((item) => item.done).length;
  const editable = task.canManage && (task.status === "ASSIGNED" || task.status === "ACCEPTED");
  const canTick = task.canManage && task.status === "ACCEPTED";

  function fail(fallback: string) {
    return (err: unknown) =>
      showToast("error", err instanceof ApiRequestError ? err.message : fallback);
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addItem.mutate(
      { taskId: task.id, text },
      { onSuccess: () => setDraft(""), onError: fail("Không thêm được mục") },
    );
  }

  function handleTick(itemId: number, checked: boolean) {
    setDone.mutate(
      { taskId: task.id, itemId, done: checked },
      {
        onSuccess: (updated) => {
          if (updated.status === "DONE" && task.status !== "DONE")
            showToast("success", "Đã tick hết, việc được hoàn thành");
        },
        onError: fail("Không cập nhật được mục"),
      },
    );
  }

  if (total === 0 && !editable) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="Checklist">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">
          Checklist{total > 0 ? ` (${done}/${total})` : ""}
        </p>
        {total > 0 && (
          <div
            className="h-1.5 w-24 overflow-hidden rounded bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
          >
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {total > 0 && task.status === "ASSIGNED" && (
        <p className="text-xs text-fg-muted">Nhận việc xong mới tick được các mục.</p>
      )}

      {total > 0 && (
        <ul className="flex flex-col gap-1">
          {task.checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded border border-line px-2.5 py-1.5"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canTick || setDone.isPending}
                onChange={(e) => handleTick(item.id, e.target.checked)}
                aria-label={item.text}
                className="h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed"
              />
              <span
                className={`min-w-0 flex-1 break-words text-sm ${item.done ? "text-fg-faint line-through" : "text-fg"}`}
              >
                {item.text}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() =>
                    removeItem.mutate(
                      { taskId: task.id, itemId: item.id },
                      { onError: fail("Không xoá được mục") },
                    )
                  }
                  disabled={removeItem.isPending}
                  aria-label={`Xoá mục ${item.text}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-faint hover:bg-surface-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  <X size={14} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && total < MAX_CHECKLIST_ITEMS && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={draft}
            maxLength={MAX_CHECKLIST_TEXT}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Thêm một bước..."
            aria-label="Mục checklist mới"
            className="min-w-0 flex-1 rounded border border-line bg-surface px-2.5 py-1.5 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
          <Button
            type="submit"
            variant="secondary"
            loading={addItem.isPending}
            disabled={!draft.trim()}
          >
            <Plus size={14} aria-hidden className="mr-1 inline" />
            Thêm
          </Button>
        </form>
      )}
    </section>
  );
}
