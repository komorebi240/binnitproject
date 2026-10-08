"use client";

import { useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel } from "@/features/auth/types";
import { useCreateTeam, useDeleteTeam, useTeams } from "../hooks/useOrganization";
import { TeamMemberList } from "./TeamMemberList";

import { useI18n } from "@/lib/i18n/useI18n";
interface TeamPanelProps {
  departmentId: number;
  departmentName: string;
  /** Only EXECUTIVE and the DEPARTMENT_HEAD of this exact department may create/delete teams
   * - this only controls whether the controls are shown; the backend re-checks independently
   * (CLAUDE.md section 9). */
  canManage: boolean;
}

export function TeamPanel({ departmentId, departmentName, canManage }: TeamPanelProps) {
  const { t } = useI18n();
  const { data: teams, isLoading } = useTeams(departmentId);
  const createTeam = useCreateTeam(departmentId);
  const deleteTeam = useDeleteTeam(departmentId);
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createTeam.mutateAsync(name);
      setName("");
      showToast("success", t("organization.teamPanel.teamCreated"));
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("organization.teamPanel.couldnTCreateTheTeam"));
    }
  }

  function handleDelete(teamId: number) {
    deleteTeam.mutate(teamId, {
      onSuccess: () => showToast("success", t("organization.teamPanel.teamDeleted")),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("organization.teamPanel.couldnTDeleteTheTeam")),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded glass-card p-5">
      <h3 className="text-base font-semibold text-fg">{t("organization.teamPanel.teamsInDepartmentName", { departmentName })}</h3>

      {isLoading ? (
        <Skeleton rows={2} />
      ) : (teams ?? []).length === 0 ? (
        <EmptyState
          title={t("organization.teamPanel.noTeamsInThisDepartmentYet")}
          description={canManage ? t("organization.teamPanel.createTheFirstTeamBelow") : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(teams ?? []).map((team) => {
            const isExpanded = expandedTeamId === team.id;
            return (
              <li key={team.id} className="rounded border border-line">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                    className="flex flex-1 items-center gap-1.5 text-left text-sm font-medium text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {isExpanded ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
                    {team.name}
                  </button>
                  {canManage && (
                    <Button variant="danger" onClick={() => handleDelete(team.id)} loading={deleteTeam.isPending}>
                      {t("common.delete")}
                    </Button>
                  )}
                </div>
                {isExpanded && (
                  <div className="animate-fade-in border-t border-line/60 px-3 py-2">
                    <TeamMemberList teamId={team.id} teamName={team.name} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Input label={t("organization.teamPanel.newTeamName")} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" loading={createTeam.isPending}>
            {t("organization.teamPanel.createTeam")}
          </Button>
        </form>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function canManageDepartmentTeams(
  authorityLevel: AuthorityLevel,
  callerDepartmentId: number | null,
  departmentId: number,
): boolean {
  if (authorityLevel === "EXECUTIVE") return true;
  return authorityLevel === "DEPARTMENT_HEAD" && callerDepartmentId === departmentId;
}
