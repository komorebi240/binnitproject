"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDepartments, useUsers } from "@/features/organization/hooks/useOrganization";
import { useCreateTask, useTasksList } from "../hooks/useTasks";
import { AttachmentDraftPicker, ChecklistDraftEditor } from "./TaskDraftFields";
import { TASK_PRIORITY_KEYS, type AssigneeType, type CreateTaskInput, type TaskPriority } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
const OPEN_STATUSES = new Set(["ASSIGNED", "ACCEPTED"]);

interface CreateTaskFormProps {
  currentUser: UserProfile;
  onDone: () => void;
}

/** Only EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD render this at all (see TasksPanel) - mirrors
 * UserManager's allowedLevelsFor pattern for who can assign to what. */
export function CreateTaskForm({ currentUser, onDone }: CreateTaskFormProps) {
  const { t } = useI18n();
  const canAssignToDepartment = currentUser.authorityLevel !== "TEAM_LEAD";
  const { data: departments } = useDepartments();
  const { data: users } = useUsers();
  const { data: allTasks } = useTasksList();
  const createTask = useCreateTask();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeType: "USER" as AssigneeType,
    assigneeUserId: "",
    assigneeDepartmentId: "",
    priority: "MEDIUM" as TaskPriority,
    dueDate: "",
    driveUrl: "",
  });
  const [checklist, setChecklist] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A department head only manages their own department; the department dropdown mirrors that
  // for UX - the backend independently re-checks this regardless (CLAUDE.md section 9).
  const assignableDepartments =
    currentUser.authorityLevel === "DEPARTMENT_HEAD"
      ? (departments ?? []).filter((d) => d.id === currentUser.departmentId)
      : (departments ?? []);

  // Shown right under the assignee picker so a manager sees what that person already has on
  // their plate before adding more - avoids accidental duplicate assignments (Phase 7 plan).
  const selectedAssigneeId = form.assigneeType === "USER" && form.assigneeUserId ? Number(form.assigneeUserId) : null;
  const selectedAssigneeOpenTasks = selectedAssigneeId
    ? (allTasks ?? []).filter((t) => t.assigneeUserId === selectedAssigneeId && OPEN_STATUSES.has(t.status))
    : [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const input: CreateTaskInput = {
        title: form.title,
        description: form.description || undefined,
        assigneeType: form.assigneeType,
        assigneeUserId: form.assigneeType === "USER" && form.assigneeUserId ? Number(form.assigneeUserId) : undefined,
        assigneeDepartmentId:
          form.assigneeType === "DEPARTMENT" && form.assigneeDepartmentId
            ? Number(form.assigneeDepartmentId)
            : undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        driveUrl: form.driveUrl.trim() || undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      };
      const { failedUploads } = await createTask.mutateAsync({ input, files });
      if (failedUploads > 0) {
        showToast("error", t("tasks.createTaskForm.taskAssignedButCountFilesCouldn", { count: failedUploads }));
      } else {
        showToast("success", t("tasks.createTaskForm.taskAssigned"));
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("tasks.createTaskForm.couldnTAssignTheTask"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input label={t("common.taskName")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="sm:col-span-2">
        <Input
          label={t("common.descriptionOptional")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <Select
        label={t("common.assignTo")}
        value={form.assigneeType}
        onChange={(e) =>
          setForm({ ...form, assigneeType: e.target.value as AssigneeType, assigneeUserId: "", assigneeDepartmentId: "" })
        }
        options={[
          { value: "USER", label: t("tasks.createTaskForm.aSpecificEmployee") },
          ...(canAssignToDepartment ? [{ value: "DEPARTMENT", label: t("tasks.createTaskForm.aWholeDepartment") }] : []),
        ]}
      />

      {form.assigneeType === "USER" ? (
        <div className="flex flex-col gap-2">
          <Select
            label={t("common.employee")}
            value={form.assigneeUserId}
            onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}
            options={[
              { value: "", label: t("tasks.createTaskForm.chooseAnEmployee") },
              ...(users ?? []).map((u) => ({ value: String(u.id), label: `${u.fullName} (${u.username})` })),
            ]}
            required
          />
          {selectedAssigneeId && (
            <div className="rounded border border-line bg-surface-muted p-2 text-xs text-fg-soft">
              <p className="mb-1 font-medium text-fg-soft">{t("tasks.createTaskForm.thisPersonSCurrentTasks")}</p>
              {selectedAssigneeOpenTasks.length === 0 ? (
                <p>{t("tasks.createTaskForm.noOpenTasks")}</p>
              ) : (
                <ul className="list-disc pl-4">
                  {selectedAssigneeOpenTasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <Select
          label={t("common.departments")}
          value={form.assigneeDepartmentId}
          onChange={(e) => setForm({ ...form, assigneeDepartmentId: e.target.value })}
          options={[
            { value: "", label: t("common.chooseADepartment") },
            ...assignableDepartments.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
          required
        />
      )}

      <Select
        label={t("common.priority")}
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
        options={(Object.keys(TASK_PRIORITY_KEYS) as TaskPriority[]).map((p) => ({ value: p, label: t(TASK_PRIORITY_KEYS[p]) }))}
      />
      <Input
        label={t("common.deadlineOptional")}
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />

      <div className="sm:col-span-2">
        <Input
          label={t("tasks.createOwnTaskForm.googleDriveLinkOptional")}
          type="url"
          placeholder="https://drive.google.com/..."
          value={form.driveUrl}
          onChange={(e) => setForm({ ...form, driveUrl: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2">
        <ChecklistDraftEditor items={checklist} onChange={setChecklist} />
      </div>
      <div className="sm:col-span-2">
        <AttachmentDraftPicker files={files} onChange={setFiles} />
      </div>

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={createTask.isPending}>
          {t("tasks.createTaskForm.assignTask")}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
