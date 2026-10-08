"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { UserProfile } from "@/features/auth/types";
import { useTasksList } from "../hooks/useTasks";
import { TASK_PRIORITY_KEYS, type Task, type TaskPriority, type TaskStatus } from "../types";
import { ChecklistProgress } from "./TaskChecklist";
import { TaskDetailModal } from "./TaskDetailModal";
import type { TranslationKey } from "@/lib/i18n/dictionary";

import { useI18n } from "@/lib/i18n/useI18n";
const RECENT_DONE_LIMIT = 8;

interface ColumnSpec {
  status: TaskStatus;
  labelKey: TranslationKey;
  /** Lightly tinted zone per status (Kanban-style); white cards on top keep text contrast. */
  tintClassName: string;
  dotClassName: string;
}

const COLUMNS: ColumnSpec[] = [
  { status: "ASSIGNED", labelKey: "tasks.homeTaskColumns.toDo", tintClassName: "bg-warning/10", dotClassName: "bg-warning" },
  { status: "ACCEPTED", labelKey: "common.inProgress", tintClassName: "bg-primary/10", dotClassName: "bg-primary" },
  { status: "DONE", labelKey: "common.done", tintClassName: "bg-success/10", dotClassName: "bg-success" },
];

const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "neutral"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

function isOverdue(task: Task, now: Date): boolean {
  if (!task.dueDate || task.status === "DONE") return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(task.dueDate) < startOfToday;
}

/** Home page's lower half: the caller's own tasks in three status columns. */
export function HomeTaskColumns({ currentUser }: { currentUser: UserProfile }) {
  const { t, intlLocale } = useI18n();
  const { data: tasks } = useTasksList();
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const now = new Date();

  const mine = (tasks ?? []).filter((t) => t.assigneeUserId === currentUser.userId);

  function itemsFor(status: TaskStatus): Task[] {
    const items = mine.filter((t) => t.status === status);
    if (status !== "DONE") return items;
    return items
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, RECENT_DONE_LIMIT);
  }

  if (mine.length === 0) {
    return <EmptyState title={t("tasks.homeTaskColumns.youHaveNoTasksYet")} description={t("tasks.homeTaskColumns.useTheButtonInTasksTo")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 [.pane-narrow_&]:md:grid-cols-1">
      {COLUMNS.map((column) => {
        const items = itemsFor(column.status);
        return (
          <section key={column.status} className={`flex flex-col gap-2 rounded-lg p-3 ${column.tintClassName}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${column.dotClassName}`} aria-hidden />
              <h3 className="text-sm font-semibold text-fg">{t(column.labelKey)}</h3>
              <span className="text-xs text-fg-muted">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-fg-faint">{t("common.noTasks")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((task) => (
                  <li key={task.id}>
                   <button
                    type="button"
                    onClick={() => setDetailTaskId(task.id)}
                    className="card-interactive block w-full rounded glass-card p-2.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                   >
                    <p className="break-words font-medium text-fg">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      <Badge tone={PRIORITY_TONE[task.priority]}>{t(TASK_PRIORITY_KEYS[task.priority])}</Badge>
                      <ChecklistProgress task={task} />
                      {task.dueDate && (
                        <span className={isOverdue(task, now) ? "font-medium text-danger" : ""}>
                          {isOverdue(task, now) ? t("tasks.homeTaskColumns.overdue") : t("tasks.homeTaskColumns.due")}
                          {new Date(task.dueDate).toLocaleDateString(intlLocale)}
                        </span>
                      )}
                    </div>
                   </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {detailTaskId != null && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>
  );
}
