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

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
type TabId = "overview" | "members" | "tasks" | "chat" | "files";

const TABS: { id: TabId; labelKey: TranslationKey; needsWork: boolean }[] = [
  { id: "overview", labelKey: "projects.projectDetailView.overview", needsWork: false },
  { id: "members", labelKey: "projects.projectDetailView.members", needsWork: false },
  { id: "tasks", labelKey: "common.tasks", needsWork: true },
  { id: "chat", labelKey: "projects.projectDetailView.chat", needsWork: true },
  { id: "files", labelKey: "projects.projectDetailView.driveFiles", needsWork: true },
];

interface ProjectDetailViewProps {
  projectId: number;
  currentUser: UserProfile;
  /** Where to go after the project is deleted (the caller owns navigation, tabs are not URL-driven). */
  onDeleted: () => void;
}

function EditProjectDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const { t } = useI18n();
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
      showToast("success", t("projects.projectDetailView.projectSaved"));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("projects.projectDetailView.couldnTSaveTheProject"));
    }
  }

  return (
    <Modal title={t("projects.projectDetailView.editProject")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label={t("projects.createProjectDialog.projectName")} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label={t("common.descriptionOptional")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={updateProject.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** One project: its departments, people, tasks, chat and shared Drive folders, in tabs. */
export function ProjectDetailView({ projectId, currentUser, onDeleted }: ProjectDetailViewProps) {
  const { t } = useI18n();
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
    return <p className="text-sm text-fg-muted">{t("projects.projectDetailView.projectNotFoundOrYouDon")}</p>;
  }

  const waiting = project.departments.filter(
    (d) => d.status === "INVITED" && project.respondableDepartmentIds.includes(d.departmentId),
  );

  function answer(departmentId: number, accept: boolean) {
    respond.mutate(
      { departmentId, accept },
      {
        onSuccess: () => showToast("success", accept ? t("projects.projectDetailView.invitationAcceptedNowChooseWhoTakes") : t("projects.projectDetailView.invitationDeclined")),
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectDetailView.couldnTRespond")),
      },
    );
  }

  function handleDelete() {
    deleteProject.mutate(project?.id ?? projectId, {
      onSuccess: () => {
        showToast("success", t("projects.projectDetailView.projectDeleted"));
        onDeleted();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectDetailView.couldnTDeleteTheProject")),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-fg">{project.name}</h1>
          <p className="text-sm text-fg-muted">{t("projects.projectDetailView.lead")} {project.ownerDepartmentName ?? "-"}</p>
          {project.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm text-fg-soft">{project.description}</p>}
        </div>
        {project.canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t("common.edit")}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteProject.isPending}>
              {t("projects.projectDetailView.deleteProject")}
            </Button>
          </div>
        )}
      </header>

      {waiting.map((department) => (
        <Alert key={department.departmentId} tone="warning" title={t("projects.projectDetailView.departmentnameIsInvitedToThisProject", { departmentName: department.departmentName ?? "" })} className="p-4">
          {department.note && <p>&ldquo;{department.note}&rdquo;</p>}
          <div className="flex gap-2">
            <Button onClick={() => answer(department.departmentId, true)} loading={respond.isPending}>
              {t("projects.projectDetailView.accept")}
            </Button>
            <Button variant="danger" onClick={() => answer(department.departmentId, false)} loading={respond.isPending}>
              {t("common.decline")}
            </Button>
          </div>
        </Alert>
      ))}

      <Tabs
        label={t("projects.projectDetailView.projectSections")}
        variant="underline"
        ids={tabIds}
        value={tab}
        onChange={setTab}
        items={TABS.map((item) => {
          const disabled = item.needsWork && !project.canWork;
          return { id: item.id, label: t(item.labelKey), disabled, title: disabled ? t("projects.projectDetailView.onlyProjectMembersCanSeeThis") : undefined };
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
