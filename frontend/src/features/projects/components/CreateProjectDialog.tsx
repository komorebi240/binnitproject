"use client";

import { useState } from "react";
import { useTabs } from "@/components/layout/TabsContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDepartments } from "@/features/organization/hooks/useOrganization";
import { useCreateProject } from "../hooks/useProjects";

import { useI18n } from "@/lib/i18n/useI18n";
/** An executive picks which department owns the project; a department head's own department always does. */
export function CreateProjectDialog({ currentUser, onClose }: { currentUser: UserProfile; onClose: () => void }) {
  const { t } = useI18n();
  const { data: departments } = useDepartments();
  const createProject = useCreateProject();
  const { navigateActiveTab } = useTabs();
  const { showToast } = useToast();
  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<number | undefined>(currentUser.departmentId ?? undefined);
  const [supportIds, setSupportIds] = useState<number[]>([]);
  const [inviteNote, setInviteNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownerDepartmentId = isExecutive ? ownerId : (currentUser.departmentId ?? undefined);
  const supportCandidates = (departments ?? []).filter((d) => d.id !== ownerDepartmentId);

  function toggleSupport(id: number) {
    setSupportIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    if (ownerDepartmentId === undefined) {
      setErrorMessage(t("projects.createProjectDialog.chooseTheLeadingDepartment"));
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        ownerDepartmentId,
        supportDepartmentIds: supportIds.filter((id) => id !== ownerDepartmentId),
        inviteNote: inviteNote.trim() || undefined,
      });
      showToast("success", t("projects.createProjectDialog.projectCreated"));
      onClose();
      navigateActiveTab(`/dashboard/projects/${project.id}`);
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("projects.createProjectDialog.couldnTCreateTheProject"));
    }
  }

  return (
    <Modal title={t("projects.createProjectDialog.createANewProject")} onClose={onClose} widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label={t("projects.createProjectDialog.projectName")} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        <Input label={t("common.descriptionOptional")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        {isExecutive && (
          <Select
            label={t("projects.createProjectDialog.leadingDepartment")}
            value={ownerId ? String(ownerId) : ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : undefined;
              setOwnerId(id);
              setSupportIds((current) => current.filter((x) => x !== id));
            }}
            options={[
              { value: "", label: t("common.chooseADepartment") },
              ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
            ]}
            required
          />
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-fg-soft">{t("projects.createProjectDialog.inviteSupportingDepartmentsOptional")}</legend>
          {supportCandidates.length === 0 ? (
            <p className="text-sm text-fg-faint">{t("projects.createProjectDialog.thereAreNoOtherDepartmentsTo")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {supportCandidates.map((d) => (
                <label key={d.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-fg-soft hover:bg-surface-muted">
                  <input type="checkbox" checked={supportIds.includes(d.id)} onChange={() => toggleSupport(d.id)} />
                  {d.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {supportIds.length > 0 && (
          <Input label={t("projects.createProjectDialog.messageWithTheInvitationOptional")} value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} maxLength={500} />
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={createProject.isPending}>
            {t("projects.createProjectDialog.createProject")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
