"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCreateTask } from "../hooks/useTasks";
import { AttachmentDraftPicker, ChecklistDraftEditor } from "./TaskDraftFields";
import { TASK_PRIORITY_KEYS, type TaskPriority } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";

interface CreateOwnTaskFormProps {
  currentUser: UserProfile;
  onDone: () => void;
  /** Pre-filled values (Smart select suggests a title, the captured text and a deadline it found). */
  initial?: { title?: string; description?: string; dueDate?: string };
}

/**
 * Anyone can give themselves a task now (Phase 7 plan - the backend only still gates assigning
 * to SOMEONE ELSE by authority tier, see TaskServiceImpl.createTask). No assignee picker since
 * it's always the caller.
 */
export function CreateOwnTaskForm({ currentUser, onDone, initial }: CreateOwnTaskFormProps) {
  const { t } = useI18n();
  const createTask = useCreateTask();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    priority: "MEDIUM" as TaskPriority,
    dueDate: initial?.dueDate ?? "",
    driveUrl: "",
  });
  const [checklist, setChecklist] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const { failedUploads } = await createTask.mutateAsync({
        input: {
          title: form.title,
          description: form.description || undefined,
          assigneeType: "USER",
          assigneeUserId: currentUser.userId,
          priority: form.priority,
          dueDate: form.dueDate || undefined,
          driveUrl: form.driveUrl.trim() || undefined,
          checklist: checklist.length > 0 ? checklist : undefined,
        },
        files,
      });
      if (failedUploads > 0) {
        showToast("error", t("tasks.createOwnTaskForm.taskAddedButCountFilesCouldn", { count: failedUploads }));
      } else {
        showToast("success", t("tasks.createOwnTaskForm.taskAdded"));
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("common.couldnTAddTheTask"));
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
      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorMessage}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={createTask.isPending}>
          {t("common.addTask")}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
