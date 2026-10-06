"use client";

import { useMemo, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import {
  useAcceptTask,
  useCancelTask,
  useCompleteTask,
  useDeclineTask,
  useDeleteTask,
  useRestoreTask,
  useTasksList,
} from "../hooks/useTasks";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TaskDetailModal } from "./TaskDetailModal";

const STATUS_LABELS: Record<TaskStatus, string> = {
  ASSIGNED: "Chờ phản hồi",
  ACCEPTED: "Đã nhận",
  DECLINED: "Đã từ chối",
  DONE: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ASSIGNED: "info",
  ACCEPTED: "warning",
  DECLINED: "danger",
  DONE: "success",
  CANCELLED: "neutral",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao" };
const PRIORITY_TONE: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

/** Mirrors TaskServiceImpl.assertCallerCanActOnTask - UX only, the backend re-checks
 * independently (CLAUDE.md section 9). */
function canActOnTask(currentUser: UserProfile, task: Task): boolean {
  if (task.assigneeType === "USER") {
    return task.assigneeUserId === currentUser.userId;
  }
  return (
    currentUser.authorityLevel === "EXECUTIVE" ||
    (currentUser.authorityLevel === "DEPARTMENT_HEAD" && task.assigneeDepartmentId === currentUser.departmentId)
  );
}

/** Mirrors TaskServiceImpl.assertCallerCanActOnAssignment, used for cancel authority. */
function canCancelTask(currentUser: UserProfile, task: Task): boolean {
  if (task.assignedByUserId === currentUser.userId) return true;
  if (currentUser.authorityLevel === "EXECUTIVE") return true;
  if (task.assigneeType === "DEPARTMENT") {
    return currentUser.authorityLevel === "DEPARTMENT_HEAD" && task.assigneeDepartmentId === currentUser.departmentId;
  }
  return false; // USER-targeted: approximated client-side as "assigner or executive only" - the
  // backend also allows the assignee's own department head/team lead, checked there.
}

interface TaskListProps {
  currentUser: UserProfile;
}

export function TaskList({ currentUser }: TaskListProps) {
  const { data: tasks, isLoading } = useTasksList();
  const accept = useAcceptTask();
  const decline = useDeclineTask();
  const complete = useCompleteTask();
  const cancel = useCancelTask();
  const restore = useRestoreTask();
  const remove = useDeleteTask();
  const { showToast } = useToast();
  const [showDone, setShowDone] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  function onErrorToast(fallback: string) {
    return (err: unknown) => showToast("error", err instanceof ApiRequestError ? err.message : fallback);
  }

  function handleAccept(id: number) {
    accept.mutate(id, { onSuccess: () => showToast("success", "Đã nhận việc"), onError: onErrorToast("Không nhận được việc") });
  }
  function handleDecline(id: number) {
    decline.mutate(id, { onSuccess: () => showToast("success", "Đã từ chối việc"), onError: onErrorToast("Không từ chối được việc") });
  }
  function handleComplete(id: number) {
    complete.mutate(id, { onSuccess: () => showToast("success", "Đã hoàn thành việc"), onError: onErrorToast("Không cập nhật được việc") });
  }
  function handleCancel(id: number) {
    cancel.mutate(id, { onSuccess: () => showToast("success", "Đã huỷ việc"), onError: onErrorToast("Không huỷ được việc") });
  }
  function handleRestore(id: number) {
    restore.mutate(id, { onSuccess: () => showToast("success", "Đã thêm lại việc"), onError: onErrorToast("Không thêm lại được việc") });
  }
  function handleDelete(id: number) {
    remove.mutate(id, { onSuccess: () => showToast("success", "Đã xoá việc"), onError: onErrorToast("Không xoá được việc") });
  }

  const activeTasks = useMemo(() => (tasks ?? []).filter((t) => t.status !== "DONE" && t.status !== "CANCELLED"), [tasks]);
  const doneTasks = useMemo(() => (tasks ?? []).filter((t) => t.status === "DONE"), [tasks]);
  const cancelledTasks = useMemo(() => (tasks ?? []).filter((t) => t.status === "CANCELLED"), [tasks]);

  const columns = [
    { header: "Việc", cell: (t: Task) => t.title },
    { header: "Giao cho", cell: (t: Task) => t.assigneeUserName ?? `Phòng ${t.assigneeDepartmentName}` },
    { header: "Người giao", cell: (t: Task) => t.assignedByUserName },
    { header: "Ưu tiên", cell: (t: Task) => <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge> },
    { header: "Trạng thái", cell: (t: Task) => <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge> },
    {
      header: "",
      cell: (t: Task) => (
        <div className="flex gap-2">
          {t.status === "ASSIGNED" && canActOnTask(currentUser, t) && (
            <>
              <Button onClick={() => handleAccept(t.id)} loading={accept.isPending}>
                Nhận
              </Button>
              <Button variant="secondary" onClick={() => handleDecline(t.id)} loading={decline.isPending}>
                Từ chối
              </Button>
            </>
          )}
          {t.status === "ACCEPTED" && canActOnTask(currentUser, t) && (
            <Button
              onClick={() => handleComplete(t.id)}
              loading={complete.isPending}
              disabled={t.checklist.length > 0}
              title={t.checklist.length > 0 ? "Tick đủ checklist trong chi tiết việc để hoàn thành" : undefined}
            >
              Hoàn thành
            </Button>
          )}
          {(t.status === "ASSIGNED" || t.status === "ACCEPTED") && canCancelTask(currentUser, t) && (
            <Button variant="danger" onClick={() => handleCancel(t.id)} loading={cancel.isPending}>
              Huỷ
            </Button>
          )}
        </div>
      ),
    },
  ];

  const cancelledColumns = [
    { header: "Việc", cell: (t: Task) => <span className="text-fg-muted line-through">{t.title}</span> },
    { header: "Giao cho", cell: (t: Task) => t.assigneeUserName ?? `Phòng ${t.assigneeDepartmentName}` },
    { header: "Người giao", cell: (t: Task) => t.assignedByUserName },
    { header: "Ưu tiên", cell: (t: Task) => <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge> },
    {
      header: "",
      cell: (t: Task) => (
        <ActionMenu
          size="sm"
          label={`Tuỳ chọn cho việc ${t.title}`}
          items={[
            { label: "Thêm lại", onSelect: () => handleRestore(t.id), disabled: restore.isPending },
            { label: "Xoá", onSelect: () => handleDelete(t.id), disabled: remove.isPending, danger: true },
          ]}
        />
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton rows={4} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Table<Task>
        columns={columns}
        rows={activeTasks}
        getRowKey={(t) => t.id}
        onRowClick={(t) => setDetailTaskId(t.id)}
        emptyState={
          <EmptyState
            title="Chưa có việc nào trong phạm vi của bạn"
            description={
              currentUser.authorityLevel !== "EMPLOYEE" ? "Giao việc đầu tiên bằng form bên dưới." : undefined
            }
          />
        }
      />

      {doneTasks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1.5 rounded text-sm font-medium text-fg-soft hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {showDone ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
            Đã hoàn thành ({doneTasks.length})
          </button>
          {showDone && (
            <div className="animate-fade-in mt-2">
              <Table<Task> columns={columns} rows={doneTasks} getRowKey={(t) => t.id} onRowClick={(t) => setDetailTaskId(t.id)} emptyState={null} />
            </div>
          )}
        </div>
      )}

      {cancelledTasks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className="flex items-center gap-1.5 rounded text-sm font-medium text-fg-soft hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {showCancelled ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
            Đã huỷ ({cancelledTasks.length})
          </button>
          {showCancelled && (
            <div className="animate-fade-in mt-2">
              <Table<Task> columns={cancelledColumns} rows={cancelledTasks} getRowKey={(t) => t.id} onRowClick={(t) => setDetailTaskId(t.id)} emptyState={null} />
            </div>
          )}
        </div>
      )}
      {detailTaskId != null && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>
  );
}
