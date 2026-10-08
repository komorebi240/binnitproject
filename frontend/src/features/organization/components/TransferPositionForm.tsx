"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel } from "@/features/auth/types";
import { useDepartments, useTeams, useUpdatePosition } from "../hooks/useOrganization";
import type { UserSummary } from "../types";

import { LEVEL_LABEL_KEYS } from "@/features/onboarding/types";
import { useI18n } from "@/lib/i18n/useI18n";
interface TransferPositionFormProps {
  user: UserSummary;
  allowedLevels: AuthorityLevel[];
  onDone: () => void;
}

/**
 * Inline row form rather than a Modal - the design system doesn't have one yet (see
 * components/ui/README.md) and this is the only place that would need it so far; add a real
 * Modal primitive if a second use case shows up (CLAUDE.md section 29).
 */
export function TransferPositionForm({ user, allowedLevels, onDone }: TransferPositionFormProps) {
  const { t } = useI18n();
  const { data: departments } = useDepartments();
  const updatePosition = useUpdatePosition();
  const { showToast } = useToast();

  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel>(user.authorityLevel);
  const [title, setTitle] = useState(user.title ?? "");
  const [departmentId, setDepartmentId] = useState<number | undefined>(user.departmentId ?? undefined);
  const [teamId, setTeamId] = useState<number | undefined>(user.teamId ?? undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: teamsInChosenDepartment } = useTeams(departmentId ?? -1);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updatePosition.mutateAsync({
        id: user.id,
        input: { authorityLevel, title: title || undefined, departmentId, teamId },
      });
      showToast("success", t("organization.transferPositionForm.positionChanged"));
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.transferPositionForm.couldnTChangeThePosition"));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded border border-line bg-surface-muted p-4 sm:grid-cols-2"
    >
      <Select
        label={t("organization.transferPositionForm.newRole")}
        value={authorityLevel}
        onChange={(e) => setAuthorityLevel(e.target.value as AuthorityLevel)}
        options={allowedLevels.map((level) => ({ value: level, label: t(LEVEL_LABEL_KEYS[level]) }))}
      />
      <Input label={t("organization.transferPositionForm.displayedJobTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />

      {authorityLevel !== "EXECUTIVE" && (
        <Select
          label={t("common.departments")}
          value={departmentId ? String(departmentId) : ""}
          onChange={(e) => {
            setDepartmentId(e.target.value ? Number(e.target.value) : undefined);
            setTeamId(undefined);
          }}
          options={[
            { value: "", label: t("common.chooseADepartment") },
            ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
          ]}
        />
      )}

      {(authorityLevel === "TEAM_LEAD" || authorityLevel === "EMPLOYEE") && departmentId && (
        <Select
          label={t("organization.transferPositionForm.teamOptionalForEmployeesRequiredFor")}
          value={teamId ? String(teamId) : ""}
          onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}
          options={[
            { value: "", label: t("common.noTeam") },
            ...(teamsInChosenDepartment ?? []).map((t) => ({ value: String(t.id), label: t.name })),
          ]}
        />
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorMessage}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={updatePosition.isPending}>
          {t("organization.transferPositionForm.confirmChange")}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
