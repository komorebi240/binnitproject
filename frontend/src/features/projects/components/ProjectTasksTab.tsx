"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCreateTask } from "@/features/tasks/hooks/useTasks";
import { TASK_PRIORITY_KEYS, type TaskPriority, type TaskStatus } from "@/features/tasks/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useProjectTasks } from "../hooks/useProjects";
import type { ProjectDetail } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_KEYS: Record<TaskStatus, TranslationKey> = {
  ASSIGNED: "common.awaitingResponse",
  ACCEPTED: "common.inProgress",
  DECLINED: "common.declined",
  DONE: "common.done",
  CANCELLED: "common.cancelled",
};
const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ASSIGNED: "info",
  ACCEPTED: "warning",
  DECLINED: "danger",
  DONE: "success",
  CANCELLED: "neutral",
};

function CreateProjectTaskDialog({ project, currentUser, onClose }: { project: ProjectDetail; currentUser: UserProfile; onClose: () => void }) {
  const { t } = useI18n();
  const createTask = useCreateTask();
  const { showToast } = useToast();
  // Mirrors the server rule: managers assign to anyone in the project, a head to their own people, everyone to themselves.
  const assignable = project.members.filter(
    (m) =>
      m.userId === currentUser.userId ||
      project.canManage ||
      (m.departmentId !== null && project.memberManageableDepartmentIds.includes(m.departmentId)),
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeUserId: String(currentUser.userId),
    priority: "MEDIUM" as TaskPriority,
    dueDate: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createTask.mutateAsync({
        input: {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          assigneeType: "USER",
          assigneeUserId: Number(form.assigneeUserId),
          priority: form.priority,
          dueDate: form.dueDate || undefined,
          projectId: project.id,
        },
      });
      showToast("success", t("projects.projectTasksTab.taskAddedToTheProject"));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("common.couldnTAddTheTask"));
    }
  }

  return (
    <Modal title={t("projects.projectTasksTab.addATaskToTheProject")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label={t("common.taskName")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
        </div>
        <div className="sm:col-span-2">
          <Input label={t("common.descriptionOptional")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Select
          label={t("common.assignTo")}
          value={form.assigneeUserId}
          onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}
          options={assignable.map((m) => ({
            value: String(m.userId),
            label: `${m.fullName}${m.userId === currentUser.userId ? t("projects.projectTasksTab.me") : ""}`,
          }))}
        />
        <Select
          label={t("common.priority")}
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
          options={(Object.keys(TASK_PRIORITY_KEYS) as TaskPriority[]).map((p) => ({ value: p, label: t(TASK_PRIORITY_KEYS[p]) }))}
        />
        <Input label={t("common.deadlineOptional")} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={createTask.isPending}>
            {t("common.addTask")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** The project's tasks for everyone in it; the person a task is for accepts and finishes it in their own Công việc page. */
export function ProjectTasksTab({ project, currentUser }: { project: ProjectDetail; currentUser: UserProfile }) {
  const { t, intlLocale } = useI18n();
  const { data: tasks, isLoading } = useProjectTasks(project.id, true);
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-fg">{t("common.projectTasks")}</h2>
        <PlusButton label={t("projects.projectTasksTab.addATaskToTheProject")} onClick={() => setCreating(true)} />
      </div>

      {isLoading ? (
        <Skeleton rows={3} />
      ) : (tasks ?? []).length === 0 ? (
        <EmptyState title={t("projects.projectTasksTab.theProjectHasNoTasksYet")} description={t("projects.projectTasksTab.clickToAssignATaskTo")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(tasks ?? []).map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{task.title}</p>
                <p className="text-xs text-fg-muted">
                  {task.assigneeUserName ?? "-"} {t("projects.projectTasksTab.assignedBy")} {task.assignedByUserName}
                  {task.dueDate ? t("projects.projectTasksTab.dueV", { v: new Date(task.dueDate).toLocaleDateString(intlLocale) }) : ""}
                  {task.checklist.length > 0 ? ` · ${task.checklist.filter((i) => i.done).length}/${task.checklist.length}` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONE[task.status]}>{t(STATUS_KEYS[task.status])}</Badge>
            </li>
          ))}
        </ul>
      )}
      {creating && <CreateProjectTaskDialog project={project} currentUser={currentUser} onClose={() => setCreating(false)} />}
    </section>
  );
}
