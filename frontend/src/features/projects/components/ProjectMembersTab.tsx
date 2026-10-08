"use client";

import { useState } from "react";
import { useTabs } from "@/components/layout/TabsContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDepartmentMembers } from "@/features/organization/hooks/useOrganization";
import { useAddProjectMember, useRemoveProjectMember } from "../hooks/useProjects";
import type { ProjectDetail, ProjectMember } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
function AddMemberDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const { t } = useI18n();
  const addMember = useAddProjectMember(project.id);
  const { showToast } = useToast();
  const departments = project.departments.filter((d) => project.memberManageableDepartmentIds.includes(d.departmentId));
  const [departmentId, setDepartmentId] = useState<number | null>(departments[0]?.departmentId ?? null);
  const { data: people, isLoading } = useDepartmentMembers(departmentId);

  const inProject = new Set(project.members.map((m) => m.userId));
  const candidates = (people ?? []).filter((p) => !inProject.has(p.userId));

  function handleAdd(userId: number, fullName: string) {
    addMember.mutate(userId, {
      onSuccess: () => showToast("success", t("projects.projectMembersTab.addedFullnameToTheProject", { fullName })),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectMembersTab.couldnTAddThisPerson")),
    });
  }

  return (
    <Modal title={t("projects.projectMembersTab.addPeopleToTheProject")} onClose={onClose}>
      {departments.length > 1 && (
        <Select
          label={t("common.departments")}
          value={departmentId ? String(departmentId) : ""}
          onChange={(e) => setDepartmentId(Number(e.target.value))}
          options={departments.map((d) => ({ value: String(d.departmentId), label: d.departmentName ?? t("projects.projectMembersTab.departmentDepartmentid", { departmentId: d.departmentId }) }))}
        />
      )}
      {isLoading ? (
        <p className="py-4 text-center text-sm text-fg-faint">{t("common.loading")}</p>
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-muted">{t("projects.projectMembersTab.everyoneInThisDepartmentIsAlready")}</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {candidates.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-muted">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar avatarUrl={person.avatarUrl} fullName={person.fullName} presenceStatus={person.presenceStatus} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{person.fullName}</span>
                  {person.title && <span className="block truncate text-xs text-fg-muted">{person.title}</span>}
                </span>
              </span>
              <Button variant="secondary" onClick={() => handleAdd(person.userId, person.fullName)} disabled={addMember.isPending}>
                {t("common.add")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function MemberRow({ member, project, currentUser }: { member: ProjectMember; project: ProjectDetail; currentUser: UserProfile }) {
  const { t } = useI18n();
  const { navigateActiveTab } = useTabs();
  const removeMember = useRemoveProjectMember(project.id);
  const { showToast } = useToast();
  const isMe = member.userId === currentUser.userId;
  const canRemove =
    isMe || project.canManage || (member.departmentId !== null && project.memberManageableDepartmentIds.includes(member.departmentId));

  function handleRemove() {
    removeMember.mutate(member.userId, {
      onSuccess: () => showToast("success", isMe ? t("projects.projectMembersTab.youLeftTheProject") : t("projects.projectMembersTab.removedFullnameFromTheProject", { fullName: member.fullName })),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTDoThat")),
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2">
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar avatarUrl={member.avatarUrl} fullName={member.fullName} presenceStatus={member.presenceStatus} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-fg">{member.fullName}</span>
          <span className="block truncate text-xs text-fg-muted">
            {member.title ?? t("projects.projectDetailView.members")} · {member.departmentName ?? t("common.executive")}
            {member.email ? ` · ${member.email}` : ""}
          </span>
        </span>
      </span>
      <span className="flex gap-2">
        {!isMe && (
          <Button
            variant="secondary"
            onClick={() => navigateActiveTab(`/dashboard/messages?with=${member.userId}&name=${encodeURIComponent(member.fullName)}`)}
          >
            {t("common.message")}
          </Button>
        )}
        {canRemove && (
          <Button variant="danger" onClick={handleRemove} loading={removeMember.isPending}>
            {isMe ? t("projects.projectMembersTab.leaveProject") : t("common.remove")}
          </Button>
        )}
      </span>
    </li>
  );
}

/** The project's people, grouped by department, with a way to message each one and (for heads) to add their own. */
export function ProjectMembersTab({ project, currentUser }: { project: ProjectDetail; currentUser: UserProfile }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const canAdd = project.memberManageableDepartmentIds.length > 0;

  const groups = new Map<string, ProjectMember[]>();
  for (const member of project.members) {
    const key = member.departmentName ?? t("common.executive");
    groups.set(key, [...(groups.get(key) ?? []), member]);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{t("projects.projectMembersTab.membersHeading", { count: project.members.length })}</h2>
        {canAdd && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t("projects.projectMembersTab.addPeople")}
          </Button>
        )}
      </div>

      {project.members.length === 0 ? (
        <EmptyState
          title={t("projects.projectMembersTab.noMembersYet")}
          description={canAdd ? t("projects.projectMembersTab.clickAddPeopleToChooseWho") : t("projects.projectMembersTab.theDepartmentHeadWillChooseWho")}
        />
      ) : (
        [...groups.entries()].map(([departmentName, members]) => (
          <div key={departmentName} className="flex flex-col gap-1.5">
            <h3 className="text-sm font-medium text-fg-soft">{departmentName}</h3>
            <ul className="flex flex-col gap-1.5">
              {members.map((member) => (
                <MemberRow key={member.userId} member={member} project={project} currentUser={currentUser} />
              ))}
            </ul>
          </div>
        ))
      )}
      {adding && <AddMemberDialog project={project} onClose={() => setAdding(false)} />}
    </section>
  );
}
