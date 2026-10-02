"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useTasksList } from "../hooks/useTasks";
import type { Task, TaskPriority } from "../types";
import { TaskDetailModal } from "./TaskDetailModal";
import type { UserProfile } from "@/features/auth/types";

const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
const PRIORITY_LABELS: Record<TaskPriority, string> = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "neutral"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

/** A dimmed tint per priority tier behind its items - inspired by a Kanban board's lightly
 * tinted columns (each status reads as "its own zone" at a glance, not just a colored label on
 * an otherwise flat list). White item cards sit on top of the tint for contrast. */
const PRIORITY_TINT_CLASSES: Record<TaskPriority, string> = {
  HIGH: "bg-red-50",
  MEDIUM: "bg-amber-50",
  LOW: "bg-gray-50",
};

interface PriorityPanelProps {
  currentUser: UserProfile;
  open: boolean;
  onClose: () => void;
}

/**
 * A Notion-style slide-over: the caller's own still-open tasks (ASSIGNED/ACCEPTED -
 * DONE/DECLINED/CANCELLED don't need attention anymore), grouped into 3 columns by
 * TaskPriority. Controlled from the header's ⭐ icon (dashboard/layout.tsx) rather than owning
 * its own floating trigger - Phase 6 moved that trigger into the header icon cluster.
 */
export function PriorityPanel({ currentUser, open, onClose }: PriorityPanelProps) {
  const { data: tasks } = useTasksList();
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  const myOpenTasks = (tasks ?? []).filter(
    (t) => t.assigneeUserId === currentUser.userId && (t.status === "ASSIGNED" || t.status === "ACCEPTED"),
  );

  const byPriority = (priority: TaskPriority): Task[] =>
    myOpenTasks.filter((t) => t.priority === priority);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex-1 bg-black/20"
          />
          <div className="animate-fade-in flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Việc cần làm theo ưu tiên</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded text-sm text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                Đóng
              </button>
            </div>

            {PRIORITY_ORDER.map((priority) => {
              const items = byPriority(priority);
              return (
                <div key={priority} className={`flex flex-col gap-2 rounded-lg p-3 ${PRIORITY_TINT_CLASSES[priority]}`}>
                  <div className="flex items-center gap-2">
                    <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABELS[priority]}</Badge>
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">Không có việc nào</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {items.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => setDetailTaskId(task.id)}
                            className="block w-full rounded bg-white px-2.5 py-1.5 text-left text-sm text-gray-800 shadow-sm transition-shadow duration-150 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            {task.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {detailTaskId != null && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </>
  );
}
