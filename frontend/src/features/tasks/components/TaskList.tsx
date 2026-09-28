"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useAcceptTask, useCancelTask, useCompleteTask, useDeclineTask, useTasksList } from "../hooks/useTasks";
import type { Task, TaskPriority, TaskStatus } from "../types";

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

/** Mirrors TaskServiceImpl.assertCallerCanActOnTask — UX only, the backend re-checks
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
  return false; // USER-targeted: approximated client-side as "assigner or executive only" — the
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
  const { showToast } = useToast();

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

  if (isLoading) {
    return <Skeleton rows={4} />;
  }

  return (
    <Table<Task>
      columns={[
        { header: "Việc", cell: (t) => t.title },
        { header: "Giao cho", cell: (t) => t.assigneeUserName ?? `Phòng ${t.assigneeDepartmentName}` },
        { header: "Người giao", cell: (t) => t.assignedByUserName },
        { header: "Ưu tiên", cell: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge> },
        { header: "Trạng thái", cell: (t) => <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge> },
        {
          header: "",
          cell: (t) => (
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
                <Button onClick={() => handleComplete(t.id)} loading={complete.isPending}>
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
      ]}
      rows={tasks ?? []}
      getRowKey={(t) => t.id}
      emptyState={
        <EmptyState
          title="Chưa có việc nào trong phạm vi của bạn"
          description={
            currentUser.authorityLevel !== "EMPLOYEE" ? "Giao việc đầu tiên bằng form bên dưới." : undefined
          }
        />
      }
    />
  );
}
