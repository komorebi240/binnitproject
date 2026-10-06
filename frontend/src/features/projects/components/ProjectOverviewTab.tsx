"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useDepartments } from "@/features/organization/hooks/useOrganization";
import { useInviteDepartment, useRemoveDepartment } from "../hooks/useProjects";
import type { ProjectDepartment, ProjectDetail, ProjectInviteStatus } from "../types";

const STATUS_LABEL: Record<ProjectInviteStatus, string> = {
  INVITED: "Chờ phản hồi",
  ACCEPTED: "Đã tham gia",
  DECLINED: "Đã từ chối",
};

const STATUS_TONE: Record<ProjectInviteStatus, "info" | "success" | "danger"> = {
  INVITED: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
};

function InviteDepartmentDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const { data: departments } = useDepartments();
  const invite = useInviteDepartment(project.id);
  const { showToast } = useToast();
  const [departmentId, setDepartmentId] = useState("");
  const [note, setNote] = useState("");

  // A department that already took part or has an open invitation cannot be invited again; a declined one can.
  const blocked = new Set(project.departments.filter((d) => d.status !== "DECLINED").map((d) => d.departmentId));
  const options = (departments ?? []).filter((d) => !blocked.has(d.id));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    invite.mutate(
      { departmentId: Number(departmentId), note: note.trim() || undefined },
      {
        onSuccess: () => {
          showToast("success", "Đã gửi lời mời");
          onClose();
        },
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không mời được phòng ban"),
      },
    );
  }

  return (
    <Modal title="Mời phòng ban hỗ trợ" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Select
          label="Phòng ban"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={[{ value: "", label: "-- Chọn phòng ban --" }, ...options.map((d) => ({ value: String(d.id), label: d.name }))]}
          required
        />
        <Input label="Lời nhắn (tuỳ chọn)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={invite.isPending}>
            Gửi lời mời
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentRow({ department, canRemove, projectId }: { department: ProjectDepartment; canRemove: boolean; projectId: number }) {
  const remove = useRemoveDepartment(projectId);
  const { showToast } = useToast();

  function handleRemove() {
    remove.mutate(department.departmentId, {
      onSuccess: () => showToast("success", "Đã gỡ phòng ban khỏi dự án"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không gỡ được phòng ban"),
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium text-fg">{department.departmentName}</p>
        <p className="text-xs text-fg-muted">
          {department.role === "OWNER" ? "Chủ trì" : "Hỗ trợ"} · {department.memberCount} thành viên
          {department.note ? ` · "${department.note}"` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={department.role === "OWNER" ? "success" : STATUS_TONE[department.status]}>
          {department.role === "OWNER" ? "Chủ trì" : STATUS_LABEL[department.status]}
        </Badge>
        {canRemove && department.role === "SUPPORT" && (
          <Button variant="danger" onClick={handleRemove} loading={remove.isPending}>
            Gỡ
          </Button>
        )}
      </div>
    </li>
  );
}

/** The departments taking part (or invited) and how each answered. */
export function ProjectOverviewTab({ project }: { project: ProjectDetail }) {
  const [inviting, setInviting] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">Phòng ban tham gia</h2>
        {project.canManage && (
          <Button variant="secondary" onClick={() => setInviting(true)}>
            Mời phòng ban
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {project.departments.map((department) => (
          <DepartmentRow key={department.departmentId} department={department} canRemove={project.canManage} projectId={project.id} />
        ))}
      </ul>
      {inviting && <InviteDepartmentDialog project={project} onClose={() => setInviting(false)} />}
    </section>
  );
}
