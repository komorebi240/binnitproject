"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, useTabsIds } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDeleteProject, useProject, useRespondToInvitation, useUpdateProject } from "../hooks/useProjects";
import type { ProjectDetail } from "../types";
import { ProjectChatTab } from "./ProjectChatTab";
import { ProjectFilesTab } from "./ProjectFilesTab";
import { ProjectMembersTab } from "./ProjectMembersTab";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectTasksTab } from "./ProjectTasksTab";

type TabId = "overview" | "members" | "tasks" | "chat" | "files";

const TABS: { id: TabId; label: string; needsWork: boolean }[] = [
  { id: "overview", label: "Tổng quan", needsWork: false },
  { id: "members", label: "Thành viên", needsWork: false },
  { id: "tasks", label: "Công việc", needsWork: true },
  { id: "chat", label: "Trao đổi", needsWork: true },
  { id: "files", label: "Tệp Drive", needsWork: true },
];

interface ProjectDetailViewProps {
  projectId: number;
  currentUser: UserProfile;
  /** Where to go after the project is deleted (the caller owns navigation, tabs are not URL-driven). */
  onDeleted: () => void;
}

function EditProjectDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const updateProject = useUpdateProject(project.id);
  const { showToast } = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateProject.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      showToast("success", "Đã lưu dự án");
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được dự án");
    }
  }

  return (
    <Modal title="Sửa dự án" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Tên dự án" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label="Mô tả (tuỳ chọn)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={updateProject.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** One project: its departments, people, tasks, chat and shared Drive folders, in tabs. */
export function ProjectDetailView({ projectId, currentUser, onDeleted }: ProjectDetailViewProps) {
  const { data: project, isLoading, isError } = useProject(projectId);
  const respond = useRespondToInvitation(projectId);
  const deleteProject = useDeleteProject();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const tabIds = useTabsIds();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return <Skeleton rows={4} />;
  }
  if (isError || !project) {
    return <p className="text-sm text-fg-muted">Không tìm thấy dự án, hoặc bạn không có quyền xem.</p>;
  }

  const waiting = project.departments.filter(
    (d) => d.status === "INVITED" && project.respondableDepartmentIds.includes(d.departmentId),
  );

  function answer(departmentId: number, accept: boolean) {
    respond.mutate(
      { departmentId, accept },
      {
        onSuccess: () => showToast("success", accept ? "Đã nhận lời mời, hãy chọn người tham gia" : "Đã từ chối lời mời"),
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không phản hồi được"),
      },
    );
  }

  function handleDelete() {
    deleteProject.mutate(project?.id ?? projectId, {
      onSuccess: () => {
        showToast("success", "Đã xoá dự án");
        onDeleted();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được dự án"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-fg">{project.name}</h1>
          <p className="text-sm text-fg-muted">Chủ trì: {project.ownerDepartmentName ?? "-"}</p>
          {project.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm text-fg-soft">{project.description}</p>}
        </div>
        {project.canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Sửa
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteProject.isPending}>
              Xoá dự án
            </Button>
          </div>
        )}
      </header>

      {waiting.map((department) => (
        <Alert key={department.departmentId} tone="warning" title={`${department.departmentName} được mời tham gia dự án này`} className="p-4">
          {department.note && <p>&ldquo;{department.note}&rdquo;</p>}
          <div className="flex gap-2">
            <Button onClick={() => answer(department.departmentId, true)} loading={respond.isPending}>
              Nhận lời
            </Button>
            <Button variant="danger" onClick={() => answer(department.departmentId, false)} loading={respond.isPending}>
              Từ chối
            </Button>
          </div>
        </Alert>
      ))}

      <Tabs
        label="Các phần của dự án"
        variant="underline"
        ids={tabIds}
        value={tab}
        onChange={setTab}
        items={TABS.map((item) => {
          const disabled = item.needsWork && !project.canWork;
          return { id: item.id, label: item.label, disabled, title: disabled ? "Chỉ thành viên dự án mới xem được" : undefined };
        })}
      />

      <div role="tabpanel" id={tabIds.panelId(tab)} aria-labelledby={tabIds.tabId(tab)} className="flex flex-col gap-5">
        {tab === "overview" && <ProjectOverviewTab project={project} />}
        {tab === "members" && <ProjectMembersTab project={project} currentUser={currentUser} />}
        {tab === "tasks" && project.canWork && <ProjectTasksTab project={project} currentUser={currentUser} />}
        {tab === "chat" && project.canWork && <ProjectChatTab project={project} currentUser={currentUser} />}
        {tab === "files" && project.canWork && <ProjectFilesTab project={project} currentUser={currentUser} />}
      </div>

      {editing && <EditProjectDialog project={project} onClose={() => setEditing(false)} />}
    </div>
  );
}
