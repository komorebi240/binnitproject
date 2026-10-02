"use client";

import { useMemo, useState } from "react";
import { CaretDown, CaretRight, Plus } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useTasksList } from "../hooks/useTasks";
import { CreateOwnTaskForm } from "./CreateOwnTaskForm";
import type { Task, TaskStatus } from "../types";
import type { UserProfile } from "@/features/auth/types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "ASSIGNED", label: "Cần làm" },
  { status: "ACCEPTED", label: "Đang làm" },
];

const PRIORITY_TONE: Record<Task["priority"], "danger" | "warning" | "neutral"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

type PeriodFilter = "all" | "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: "Tất cả",
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  year: "Năm nay",
};

/** Start of the Monday-based week containing `now`. */
function startOfWeek(now: Date): Date {
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  return start;
}

function periodStart(period: PeriodFilter, now: Date): Date | null {
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return startOfWeek(now);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

/**
 * The ☰ header icon overwrites the whole Home page with this: a compact, low-detail kanban of
 * the caller's own tasks grouped by status. Clicking a card expands it in place with the detail
 * a dense card view deliberately leaves out (description, due date, priority) — no new endpoint,
 * just a different view over the same `useTasksList` data the KPI cards already use.
 *
 * Completed tasks are collapsed into their own section by default (collapsed, not shown as a
 * third always-open column) so the board stays about what's still outstanding; a period filter
 * (day/week/month/year/all) scopes everything shown by `createdAt`, same convention as the KPI
 * cards' month scoping.
 */
export function TaskBoardView({ currentUser }: { currentUser: UserProfile }) {
  const { data: tasks } = useTasksList();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const myTasks = useMemo(() => {
    const mine = (tasks ?? []).filter((t) => t.assigneeUserId === currentUser.userId);
    const start = periodStart(period, new Date());
    if (!start) return mine;
    return mine.filter((t) => new Date(t.createdAt) >= start);
  }, [tasks, currentUser.userId, period]);

  const completedTasks = myTasks.filter((t) => t.status === "DONE");

  function renderCard(task: Task) {
    const isExpanded = expandedId === task.id;
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => setExpandedId(isExpanded ? null : task.id)}
        className="card-interactive rounded border border-gray-200 bg-white p-2.5 text-left text-sm shadow-sm hover:border-primary/40"
      >
        <p className="font-medium text-gray-900">{task.title}</p>
        {isExpanded && (
          <div className="animate-fade-in mt-2 flex flex-col gap-1.5 border-t border-gray-100 pt-2 text-xs text-gray-600">
            {task.description && <p>{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
              {task.dueDate && <span>Deadline: {new Date(task.dueDate).toLocaleDateString("vi-VN")}</span>}
            </div>
          </div>
        )}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="w-48">
          <Select
            label="Khoảng thời gian"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            options={(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          title="Tự thêm việc cho mình"
          aria-label="Tự thêm việc cho mình"
          className="gradient-surface flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground shadow-sm transition-all duration-150 hover:shadow-md hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus size={18} weight="bold" aria-hidden />
        </button>
      </div>

      {creating && <CreateOwnTaskForm currentUser={currentUser} onDone={() => setCreating(false)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COLUMNS.map((column) => {
          const items = myTasks.filter((t) => t.status === column.status);
          return (
            <div key={column.status} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{column.label}</p>
                <span className="text-xs text-gray-400">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">Không có việc nào</p>
                ) : (
                  items.map(renderCard)
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          className="flex items-center gap-1.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {showCompleted ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
          Đã hoàn thành ({completedTasks.length})
        </button>
        {showCompleted && (
          <div className="animate-fade-in mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {completedTasks.length === 0 ? (
              <p className="text-xs text-gray-400">Chưa có việc nào hoàn thành trong khoảng thời gian này</p>
            ) : (
              completedTasks.map(renderCard)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
