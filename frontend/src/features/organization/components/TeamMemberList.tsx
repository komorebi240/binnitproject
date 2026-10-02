"use client";

import { useTeamMembers } from "../hooks/useOrganization";
import { MemberList } from "./MemberList";

interface TeamMemberListProps {
  teamId: number;
  teamName: string;
}

/** Same internal-directory visibility rule as DepartmentMemberList — anyone in the same company
 * can see a team's members (OrganizationService.listTeamMembers). */
export function TeamMemberList({ teamId, teamName }: TeamMemberListProps) {
  const { data: members, isLoading } = useTeamMembers(teamId);
  return (
    <MemberList
      members={members}
      isLoading={isLoading}
      contextLabel={teamName}
      emptyTitle="Nhóm này chưa có thành viên nào"
    />
  );
}
