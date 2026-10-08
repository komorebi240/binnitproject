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
import { TASK_PRIORITY_KEYS, TASK_STATUS_KEYS, type Task, type TaskPriority, type TaskStatus } from "../types";
import { TaskDetailModal } from "./TaskDetailModal";

import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ASSIGNED: "info",
  ACCEPTED: "warning",
  DECLINED: "danger",
  DONE: "success",
  CANCELLED: "neutral",
};

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
  const { t } = useI18n();
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
    accept.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskList.taskAccepted")), onError: onErrorToast(t("tasks.taskList.couldnTAcceptTheTask")) });
  }
  function handleDecline(id: number) {
    decline.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskList.taskDeclined")), onError: onErrorToast(t("tasks.taskList.couldnTDeclineTheTask")) });
  }
  function handleComplete(id: number) {
    complete.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskList.taskCompleted")), onError: onErrorToast(t("tasks.taskList.couldnTUpdateTheTask")) });
  }
  function handleCancel(id: number) {
    cancel.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskList.taskCancelled")), onError: onErrorToast(t("tasks.taskList.couldnTCancelTheTask")) });
  }
  function handleRestore(id: number) {
    restore.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskBoardView.taskRestored")), onError: onErrorToast(t("tasks.taskBoardView.couldnTRestoreTheTask")) });
  }
  function handleDelete(id: number) {
    remove.mutate(id, { onSuccess: () => showToast("success", t("tasks.taskBoardView.taskDeleted")), onError: onErrorToast(t("tasks.taskBoardView.couldnTDeleteTheTask")) });
  }

  const activeTasks = useMemo(() => (tasks ?? []).filter((task) => task.status !== "DONE" && task.status !== "CANCELLED"), [tasks]);
  const doneTasks = useMemo(() => (tasks ?? []).filter((task) => task.status === "DONE"), [tasks]);
  const cancelledTasks = useMemo(() => (tasks ?? []).filter((task) => task.status === "CANCELLED"), [tasks]);

  const columns = [
    { header: t("tasks.taskList.task"), cell: (task: Task) => task.title },
    { header: t("tasks.taskList.assignedTo"), cell: (task: Task) => task.assigneeUserName ?? t("tasks.taskList.departmentAssigneedepartmentname", { assigneeDepartmentName: task.assigneeDepartmentName ?? "" }) },
    { header: t("tasks.taskList.assignedBy"), cell: (task: Task) => task.assignedByUserName },
    { header: t("tasks.taskList.priority"), cell: (task: Task) => <Badge tone={PRIORITY_TONE[task.priority]}>{t(TASK_PRIORITY_KEYS[task.priority])}</Badge> },
    { header: t("common.status"), cell: (task: Task) => <Badge tone={STATUS_TONE[task.status]}>{t(TASK_STATUS_KEYS[task.status])}</Badge> },
    {
      header: "",
      cell: (task: Task) => (
        <div className="flex gap-2">
          {task.status === "ASSIGNED" && canActOnTask(currentUser, task) && (
            <>
              <Button onClick={() => handleAccept(task.id)} loading={accept.isPending}>
                {t("tasks.taskList.accept")}
              </Button>
              <Button variant="secondary" onClick={() => handleDecline(task.id)} loading={decline.isPending}>
                {t("common.decline")}
              </Button>
            </>
          )}
          {task.status === "ACCEPTED" && canActOnTask(currentUser, task) && (
            <Button
              onClick={() => handleComplete(task.id)}
              loading={complete.isPending}
              disabled={task.checklist.length > 0}
              title={task.checklist.length > 0 ? t("tasks.taskList.tickTheWholeChecklistInThe") : undefined}
            >
              {t("common.done")}
            </Button>
          )}
          {(task.status === "ASSIGNED" || task.status === "ACCEPTED") && canCancelTask(currentUser, task) && (
            <Button variant="danger" onClick={() => handleCancel(task.id)} loading={cancel.isPending}>
              {t("common.cancel")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const cancelledColumns = [
    { header: t("tasks.taskList.task"), cell: (task: Task) => <span className="text-fg-muted line-through">{task.title}</span> },
    { header: t("tasks.taskList.assignedTo"), cell: (task: Task) => task.assigneeUserName ?? t("tasks.taskList.departmentAssigneedepartmentname", { assigneeDepartmentName: task.assigneeDepartmentName ?? "" }) },
    { header: t("tasks.taskList.assignedBy"), cell: (task: Task) => task.assignedByUserName },
    { header: t("tasks.taskList.priority"), cell: (task: Task) => <Badge tone={PRIORITY_TONE[task.priority]}>{t(TASK_PRIORITY_KEYS[task.priority])}</Badge> },
    {
      header: "",
      cell: (task: Task) => (
        <ActionMenu
          size="sm"
          label={t("tasks.taskList.optionsForTaskTitle", { title: task.title })}
          items={[
            { label: t("tasks.taskBoardView.restore"), onSelect: () => handleRestore(task.id), disabled: restore.isPending },
            { label: t("common.delete"), onSelect: () => handleDelete(task.id), disabled: remove.isPending, danger: true },
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
        getRowKey={(task) => task.id}
        onRowClick={(task) => setDetailTaskId(task.id)}
        emptyState={
          <EmptyState
            title={t("tasks.taskList.noTasksInYourScopeYet")}
            description={
              currentUser.authorityLevel !== "EMPLOYEE" ? t("tasks.taskList.assignTheFirstTaskWithThe") : undefined
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
            {t("tasks.taskBoardView.completedCount", { count: doneTasks.length })}
          </button>
          {showDone && (
            <div className="animate-fade-in mt-2">
              <Table<Task> columns={columns} rows={doneTasks} getRowKey={(task) => task.id} onRowClick={(task) => setDetailTaskId(task.id)} emptyState={null} />
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
            {t("tasks.taskBoardView.cancelledCount", { count: cancelledTasks.length })}
          </button>
          {showCancelled && (
            <div className="animate-fade-in mt-2">
              <Table<Task> columns={cancelledColumns} rows={cancelledTasks} getRowKey={(task) => task.id} onRowClick={(task) => setDetailTaskId(task.id)} emptyState={null} />
            </div>
          )}
        </div>
      )}
      {detailTaskId != null && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>
  );
}
