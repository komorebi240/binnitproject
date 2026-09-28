"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDepartments, useUsers } from "@/features/organization/hooks/useOrganization";
import { useCreateTask } from "../hooks/useTasks";
import type { AssigneeType, CreateTaskInput, TaskPriority } from "../types";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

interface CreateTaskFormProps {
  currentUser: UserProfile;
}

/** Only EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD render this at all (see TasksPanel) — mirrors
 * UserManager's allowedLevelsFor pattern for who can assign to what. */
export function CreateTaskForm({ currentUser }: CreateTaskFormProps) {
  const canAssignToDepartment = currentUser.authorityLevel !== "TEAM_LEAD";
  const { data: departments } = useDepartments();
  const { data: users } = useUsers();
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
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A department head only manages their own department; the department dropdown mirrors that
  // for UX — the backend independently re-checks this regardless (CLAUDE.md section 9).
  const assignableDepartments =
    currentUser.authorityLevel === "DEPARTMENT_HEAD"
      ? (departments ?? []).filter((d) => d.id === currentUser.departmentId)
      : (departments ?? []);

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
      };
      await createTask.mutateAsync(input);
      setForm((prev) => ({ ...prev, title: "", description: "", assigneeUserId: "", assigneeDepartmentId: "", dueDate: "" }));
      showToast("success", "Đã giao việc");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không giao được việc");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded border border-gray-200 p-4 sm:grid-cols-2">
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
        label="Giao cho"
        value={form.assigneeType}
        onChange={(e) =>
          setForm({ ...form, assigneeType: e.target.value as AssigneeType, assigneeUserId: "", assigneeDepartmentId: "" })
        }
        options={[
          { value: "USER", label: "Một nhân viên cụ thể" },
          ...(canAssignToDepartment ? [{ value: "DEPARTMENT", label: "Cả một phòng ban" }] : []),
        ]}
      />

      {form.assigneeType === "USER" ? (
        <Select
          label="Nhân viên"
          value={form.assigneeUserId}
          onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}
          options={[
            { value: "", label: "-- Chọn nhân viên --" },
            ...(users ?? []).map((u) => ({ value: String(u.id), label: `${u.fullName} (${u.username})` })),
          ]}
          required
        />
      ) : (
        <Select
          label="Phòng ban"
          value={form.assigneeDepartmentId}
          onChange={(e) => setForm({ ...form, assigneeDepartmentId: e.target.value })}
          options={[
            { value: "", label: "-- Chọn phòng ban --" },
            ...assignableDepartments.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
          required
        />
      )}

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
        <Button type="submit" loading={createTask.isPending}>
          Giao việc
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
