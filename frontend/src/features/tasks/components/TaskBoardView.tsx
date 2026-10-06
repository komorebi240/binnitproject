"use client";

import { useMemo, useState } from "react";
import { CaretDown, CaretRight, DotsThreeVertical } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useDeleteTask, useRestoreTask, useTasksList } from "../hooks/useTasks";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import { ChecklistProgress } from "./TaskChecklist";
import { TaskDetailModal } from "./TaskDetailModal";
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
 * a dense card view deliberately leaves out (description, due date, priority) - no new endpoint,
 * just a different view over the same `useTasksList` data the KPI cards already use.
 *
 * Completed tasks are collapsed into their own section by default (collapsed, not shown as a
 * third always-open column) so the board stays about what's still outstanding; a period filter
 * (day/week/month/year/all) scopes everything shown by `createdAt`, same convention as the KPI
 * cards' month scoping.
 */
export function TaskBoardView({ currentUser }: { currentUser: UserProfile }) {
  const { data: tasks } = useTasksList();
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const restoreTask = useRestoreTask();
  const deleteTask = useDeleteTask();
  const { showToast } = useToast();

  const myTasks = useMemo(() => {
    const mine = (tasks ?? []).filter((t) => t.assigneeUserId === currentUser.userId);
    const start = periodStart(period, new Date());
    if (!start) return mine;
    return mine.filter((t) => new Date(t.createdAt) >= start);
  }, [tasks, currentUser.userId, period]);

  const completedTasks = myTasks.filter((t) => t.status === "DONE");
  const cancelledTasks = myTasks.filter((t) => t.status === "CANCELLED");

  function handleRestore(id: number) {
    setOpenMenuId(null);
    restoreTask.mutate(id, {
      onSuccess: () => showToast("success", "Đã thêm lại việc"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không thêm lại được việc"),
    });
  }

  function handleDelete(id: number) {
    setOpenMenuId(null);
    deleteTask.mutate(id, {
      onSuccess: () => showToast("success", "Đã xoá việc"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được việc"),
    });
  }

  function renderCancelledCard(task: Task) {
    return (
      <div key={task.id} className="relative rounded glass-card p-2.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => setDetailTaskId(task.id)} className="text-left font-medium text-fg-muted line-through hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{task.title}</button>
          <button
            type="button"
            onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
            aria-label="Tuỳ chọn"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <DotsThreeVertical size={16} weight="bold" aria-hidden />
          </button>
        </div>

        {openMenuId === task.id && (
          <>
            <button type="button" aria-label="Đóng" onClick={() => setOpenMenuId(null)} className="fixed inset-0 z-20 cursor-default" />
            <div className="animate-fade-in absolute right-2 top-9 z-30 w-36 rounded glass py-1 text-sm">
              <button
                type="button"
                onClick={() => handleRestore(task.id)}
                disabled={restoreTask.isPending}
                className="block w-full px-3 py-1.5 text-left text-fg-soft hover:bg-surface-muted disabled:opacity-50"
              >
                Thêm lại
              </button>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={deleteTask.isPending}
                className="block w-full px-3 py-1.5 text-left text-danger hover:bg-surface-muted disabled:opacity-50"
              >
                Xoá
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderCard(task: Task) {
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => setDetailTaskId(task.id)}
        className="card-interactive rounded glass-card p-2.5 text-left text-sm hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <p className="font-medium text-fg">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
          <ChecklistProgress task={task} />
          {task.dueDate && <span>Deadline: {new Date(task.dueDate).toLocaleDateString("vi-VN")}</span>}
        </div>
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
        <PlusButton label="Tự thêm việc cho mình" onClick={() => setCreating(true)} />
      </div>

      {creating && (
        <Modal title="Thêm việc cho mình" onClose={() => setCreating(false)}>
          <CreateOwnTaskForm currentUser={currentUser} onDone={() => setCreating(false)} />
        </Modal>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [.pane-narrow_&]:sm:grid-cols-1">
        {COLUMNS.map((column) => {
          const items = myTasks.filter((t) => t.status === column.status);
          return (
            <div key={column.status} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-fg">{column.label}</p>
                <span className="text-xs text-fg-faint">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <p className="text-xs text-fg-faint">Không có việc nào</p>
                ) : (
                  items.map(renderCard)
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-line/60 pt-3">
        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          className="flex items-center gap-1.5 rounded text-sm font-medium text-fg-soft hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {showCompleted ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
          Đã hoàn thành ({completedTasks.length})
        </button>
        {showCompleted && (
          <div className="animate-fade-in mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 [.pane-narrow_&]:sm:grid-cols-1">
            {completedTasks.length === 0 ? (
              <p className="text-xs text-fg-faint">Chưa có việc nào hoàn thành trong khoảng thời gian này</p>
            ) : (
              completedTasks.map(renderCard)
            )}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-line/60 pt-3">
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          className="flex items-center gap-1.5 rounded text-sm font-medium text-fg-soft hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {showCancelled ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
          Đã huỷ ({cancelledTasks.length})
        </button>
        {showCancelled && (
          <div className="animate-fade-in mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 [.pane-narrow_&]:sm:grid-cols-1">
            {cancelledTasks.length === 0 ? (
              <p className="text-xs text-fg-faint">Chưa có việc nào bị huỷ trong khoảng thời gian này</p>
            ) : (
              cancelledTasks.map(renderCancelledCard)
            )}
          </div>
        )}
      </div>
      {detailTaskId != null && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>
  );
}
