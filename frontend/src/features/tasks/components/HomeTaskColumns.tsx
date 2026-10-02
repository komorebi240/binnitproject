"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { UserProfile } from "@/features/auth/types";
import { useTasksList } from "../hooks/useTasks";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TaskDetailModal } from "./TaskDetailModal";

const RECENT_DONE_LIMIT = 8;

interface ColumnSpec {
  status: TaskStatus;
  label: string;
  /** Lightly tinted zone per status (Kanban-style); white cards on top keep text contrast. */
  tintClassName: string;
  dotClassName: string;
}

const COLUMNS: ColumnSpec[] = [
  { status: "ASSIGNED", label: "Cần làm", tintClassName: "bg-amber-50", dotClassName: "bg-amber-500" },
  { status: "ACCEPTED", label: "Đang làm", tintClassName: "bg-indigo-50", dotClassName: "bg-primary" },
  { status: "DONE", label: "Hoàn thành", tintClassName: "bg-green-50", dotClassName: "bg-green-500" },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
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
    return <EmptyState title="Bạn chưa có việc nào" description="Dùng nút + ở mục Công việc để tự thêm việc cho mình." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((column) => {
        const items = itemsFor(column.status);
        return (
          <section key={column.status} className={`flex flex-col gap-2 rounded-lg p-3 ${column.tintClassName}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${column.dotClassName}`} aria-hidden />
              <h3 className="text-sm font-semibold text-gray-900">{column.label}</h3>
              <span className="text-xs text-gray-500">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400">Không có việc nào</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((task) => (
                  <li key={task.id}>
                   <button
                    type="button"
                    onClick={() => setDetailTaskId(task.id)}
                    className="card-interactive block w-full rounded border border-gray-200 bg-white p-2.5 text-left text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                   >
                    <p className="break-words font-medium text-gray-900">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                      {task.dueDate && (
                        <span className={isOverdue(task, now) ? "font-medium text-danger" : ""}>
                          {isOverdue(task, now) ? "Quá hạn " : "Hạn "}
                          {new Date(task.dueDate).toLocaleDateString("vi-VN")}
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
