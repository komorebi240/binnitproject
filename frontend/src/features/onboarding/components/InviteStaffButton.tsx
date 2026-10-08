"use client";

import { useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel, UserProfile } from "@/features/auth/types";
import { allowedLevelsFor } from "@/features/organization/grantLevels";
import { useDepartments, useTeams } from "@/features/organization/hooks/useOrganization";
import {
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "../hooks/useOnboarding";
import { onboardingErrorMessage } from "../errors";
import { LEVEL_LABEL_KEYS, type Invitation } from "../types";

import { useI18n, type I18n } from "@/lib/i18n/useI18n";
function daysLeft(invitation: Invitation, t: I18n["t"]): string {
  if (invitation.expired) return t("onboarding.inviteStaffButton.expired");
  const days = Math.max(1, Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / 86_400_000));
  return t("onboarding.inviteStaffButton.daysLeft", { count: days });
}

function InviteDialog({ currentUser, onClose }: { currentUser: UserProfile; onClose: () => void }) {
  const { t } = useI18n();
  const allowedLevels = allowedLevelsFor(currentUser.authorityLevel);
  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
  const isTeamLead = currentUser.authorityLevel === "TEAM_LEAD";

  const { data: departments } = useDepartments();
  const { data: invitations } = useInvitations(true);
  const createInvitation = useCreateInvitation();
  const resendInvitation = useResendInvitation();
  const revokeInvitation = useRevokeInvitation();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel>(allowedLevels[allowedLevels.length - 1] ?? "EMPLOYEE");
  const [departmentId, setDepartmentId] = useState<number | undefined>(currentUser.departmentId ?? undefined);
  const [teamId, setTeamId] = useState<number | undefined>(currentUser.teamId ?? undefined);
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const needsScope = authorityLevel !== "EXECUTIVE";
  const needsTeam = authorityLevel === "TEAM_LEAD";
  const canPickTeam = authorityLevel === "TEAM_LEAD" || authorityLevel === "EMPLOYEE";
  const { data: teams } = useTeams(departmentId ?? -1);

  function onError(fallback: string) {
    return (err: unknown) => showToast("error", err instanceof ApiRequestError ? err.message : fallback);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createInvitation.mutateAsync({
        email: email.trim(),
        authorityLevel,
        departmentId: needsScope ? departmentId : undefined,
        teamId: needsScope && canPickTeam ? teamId : undefined,
        title: title.trim() || undefined,
      });
      showToast("success", t("onboarding.inviteStaffButton.invitationSentToV", { v: email.trim() }));
      setEmail("");
      setTitle("");
    } catch (err) {
      setErrorMessage(onboardingErrorMessage(err, t("onboarding.inviteStaffButton.couldnTSendTheInvitation"), t));
    }
  }

  return (
    <Modal title={t("common.inviteStaffByEmail")} onClose={onClose} widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label={t("onboarding.inviteStaffButton.inviteeSEmail")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Select
          label={t("common.role")}
          value={authorityLevel}
          onChange={(e) => setAuthorityLevel(e.target.value as AuthorityLevel)}
          options={allowedLevels.map((level) => ({ value: level, label: t(LEVEL_LABEL_KEYS[level]) }))}
        />
        <Input label={t("onboarding.inviteStaffButton.jobTitleOptional")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />

        {isExecutive && needsScope && (
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
            required
          />
        )}

        {!isTeamLead && needsScope && canPickTeam && departmentId != null && (
          <Select
            label={needsTeam ? t("onboarding.inviteStaffButton.teamRequiredForATeamLead") : t("onboarding.inviteStaffButton.teamOptional")}
            value={teamId ? String(teamId) : ""}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}
            options={[
              { value: "", label: needsTeam ? t("onboarding.inviteStaffButton.chooseATeam") : t("common.noTeam") },
              ...(teams ?? []).map((t) => ({ value: String(t.id), label: t.name })),
            ]}
            required={needsTeam}
          />
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {errorMessage}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={createInvitation.isPending}>
            {t("common.sendInvitation")}
          </Button>
          <p className="mt-1.5 text-xs text-fg-muted">{t("onboarding.inviteStaffButton.theRecipientOpensTheLinkIn")}</p>
        </div>
      </form>

      <section className="flex flex-col gap-2 border-t border-line/60 pt-3">
        <h4 className="text-sm font-semibold text-fg">{t("onboarding.inviteStaffButton.pendingInvitationsCount", { count: (invitations ?? []).length })}</h4>
        {(invitations ?? []).length === 0 ? (
          <p className="text-sm text-fg-faint">{t("onboarding.inviteStaffButton.noPendingInvitations")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(invitations ?? []).map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-2 rounded border border-line px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{invitation.email}</p>
                  <p className="text-xs text-fg-muted">
                    {t(LEVEL_LABEL_KEYS[invitation.authorityLevel])}
                    {invitation.departmentName ? ` · ${invitation.departmentName}` : ""}
                    {invitation.teamName ? ` · ${invitation.teamName}` : ""}
                  </p>
                </div>
                <Badge tone={invitation.expired ? "danger" : "info"}>{daysLeft(invitation, t)}</Badge>
                <Button
                  variant="secondary"
                  loading={resendInvitation.isPending && resendInvitation.variables === invitation.id}
                  onClick={() =>
                    resendInvitation.mutate(invitation.id, {
                      onSuccess: () => showToast("success", t("onboarding.inviteStaffButton.invitationResent")),
                      onError: onError(t("onboarding.inviteStaffButton.couldnTResendIt")),
                    })
                  }
                >
                  {t("onboarding.inviteStaffButton.resend")}
                </Button>
                <Button
                  variant="danger"
                  loading={revokeInvitation.isPending && revokeInvitation.variables === invitation.id}
                  onClick={() =>
                    revokeInvitation.mutate(invitation.id, {
                      onSuccess: () => showToast("success", t("onboarding.inviteStaffButton.invitationRevoked")),
                      onError: onError(t("common.couldnTRecallIt")),
                    })
                  }
                >
                  {t("common.recall")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}

/** "Mời qua email" button + dialog for the Nhân sự screen; managers only (the backend enforces it too). */
export function InviteStaffButton({ currentUser }: { currentUser: UserProfile }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (allowedLevelsFor(currentUser.authorityLevel).length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="invite-staff"
        className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1 text-xs font-medium text-fg-soft transition-colors duration-150 hover:border-primary hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <EnvelopeSimple size={14} aria-hidden />
        {t("onboarding.inviteStaffButton.inviteByEmail")}
      </button>
      {open && <InviteDialog currentUser={currentUser} onClose={() => setOpen(false)} />}
    </>
  );
}
