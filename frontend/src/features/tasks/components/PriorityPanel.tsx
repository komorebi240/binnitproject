"use client";

import { Badge } from "@/components/ui/Badge";
import { useTasksList } from "../hooks/useTasks";
import type { Task, TaskPriority } from "../types";
import type { UserProfile } from "@/features/auth/types";

const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
const PRIORITY_LABELS: Record<TaskPriority, string> = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "neutral"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

interface PriorityPanelProps {
  currentUser: UserProfile;
  open: boolean;
  onClose: () => void;
}

/**
 * A Notion-style slide-over: the caller's own still-open tasks (ASSIGNED/ACCEPTED —
 * DONE/DECLINED/CANCELLED don't need attention anymore), grouped into 3 columns by
 * TaskPriority. Controlled from the header's ⭐ icon (dashboard/layout.tsx) rather than owning
 * its own floating trigger — Phase 6 moved that trigger into the header icon cluster.
 */
export function PriorityPanel({ currentUser, open, onClose }: PriorityPanelProps) {
  const { data: tasks } = useTasksList();

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
                <div key={priority} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABELS[priority]}</Badge>
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">Không có việc nào</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {items.map((task) => (
                        <li
                          key={task.id}
                          className="rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800"
                        >
                          {task.title}
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
    </>
  );
}
