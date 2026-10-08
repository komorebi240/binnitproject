"use client";

import { useTeamMembers } from "../hooks/useOrganization";
import { MemberList } from "./MemberList";

import { useI18n } from "@/lib/i18n/useI18n";
interface TeamMemberListProps {
  teamId: number;
  teamName: string;
}

/** Same internal-directory visibility rule as DepartmentMemberList - anyone in the same company
 * can see a team's members (OrganizationService.listTeamMembers). */
export function TeamMemberList({ teamId, teamName }: TeamMemberListProps) {
  const { t } = useI18n();
  const { data: members, isLoading } = useTeamMembers(teamId);
  return (
    <MemberList
      members={members}
      isLoading={isLoading}
      contextLabel={teamName}
      emptyTitle={t("organization.teamMemberList.thisTeamHasNoMembersYet")}
    />
  );
}
