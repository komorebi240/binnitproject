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

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_KEYS: Record<ProjectInviteStatus, TranslationKey> = {
  INVITED: "common.awaitingResponse",
  ACCEPTED: "projects.projectOverviewTab.joined",
  DECLINED: "common.declined",
};

const STATUS_TONE: Record<ProjectInviteStatus, "info" | "success" | "danger"> = {
  INVITED: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
};

function InviteDepartmentDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const { t } = useI18n();
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
          showToast("success", t("projects.projectOverviewTab.invitationSent"));
          onClose();
        },
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectOverviewTab.couldnTInviteTheDepartment")),
      },
    );
  }

  return (
    <Modal title={t("common.inviteASupportingDepartment")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Select
          label={t("common.departments")}
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={[{ value: "", label: t("common.chooseADepartment") }, ...options.map((d) => ({ value: String(d.id), label: d.name }))]}
          required
        />
        <Input label={t("projects.projectOverviewTab.messageOptional")} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={invite.isPending}>
            {t("common.sendInvitation")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentRow({ department, canRemove, projectId }: { department: ProjectDepartment; canRemove: boolean; projectId: number }) {
  const { t } = useI18n();
  const remove = useRemoveDepartment(projectId);
  const { showToast } = useToast();

  function handleRemove() {
    remove.mutate(department.departmentId, {
      onSuccess: () => showToast("success", t("projects.projectOverviewTab.departmentRemovedFromTheProject")),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectOverviewTab.couldnTRemoveTheDepartment")),
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium text-fg">{department.departmentName}</p>
        <p className="text-xs text-fg-muted">
          {department.role === "OWNER" ? t("projects.projectOverviewTab.lead") : t("projects.projectOverviewTab.support")} · {t("projects.memberCount", { count: department.memberCount })}
          {department.note ? ` · "${department.note}"` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={department.role === "OWNER" ? "success" : STATUS_TONE[department.status]}>
          {department.role === "OWNER" ? t("projects.projectOverviewTab.lead") : t(STATUS_KEYS[department.status])}
        </Badge>
        {canRemove && department.role === "SUPPORT" && (
          <Button variant="danger" onClick={handleRemove} loading={remove.isPending}>
            {t("common.remove")}
          </Button>
        )}
      </div>
    </li>
  );
}

/** The departments taking part (or invited) and how each answered. */
export function ProjectOverviewTab({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const [inviting, setInviting] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{t("projects.projectOverviewTab.participatingDepartments")}</h2>
        {project.canManage && (
          <Button variant="secondary" onClick={() => setInviting(true)}>
            {t("projects.projectOverviewTab.inviteADepartment")}
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
