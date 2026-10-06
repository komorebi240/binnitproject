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
import type { TaskPriority } from "../types";

const PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao" };

interface CreateOwnTaskFormProps {
  currentUser: UserProfile;
  onDone: () => void;
}

/**
 * Anyone can give themselves a task now (Phase 7 plan - the backend only still gates assigning
 * to SOMEONE ELSE by authority tier, see TaskServiceImpl.createTask). No assignee picker since
 * it's always the caller.
 */
export function CreateOwnTaskForm({ currentUser, onDone }: CreateOwnTaskFormProps) {
  const createTask = useCreateTask();
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM" as TaskPriority, dueDate: "", driveUrl: "" });
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
        showToast("error", `Đã thêm việc nhưng ${failedUploads} tệp không tải lên được, hãy đính kèm lại trong chi tiết việc`);
      } else {
        showToast("success", "Đã thêm việc");
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không thêm được việc");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input label="Tên việc" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="sm:col-span-2">
        <Input
          label="Mô tả (tuỳ chọn)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <Select
        label="Độ ưu tiên"
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
        options={(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
      />
      <Input
        label="Hạn chót (tuỳ chọn)"
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />
      <div className="sm:col-span-2">
        <Input
          label="Link Google Drive (tuỳ chọn)"
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
          Thêm việc
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
