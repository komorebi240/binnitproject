"use client";

import { useDepartmentMembers } from "../hooks/useOrganization";
import { MemberList } from "./MemberList";

interface DepartmentMemberListProps {
  departmentId: number;
  departmentName: string;
}

/**
 * Internal company directory for one department (Phase 7 plan) — readable by anyone, not just
 * managers (see OrganizationService.listDepartmentMembers). Rendering itself lives in
 * MemberList, shared with TeamMemberList.
 */
export function DepartmentMemberList({ departmentId, departmentName }: DepartmentMemberListProps) {
  const { data: members, isLoading } = useDepartmentMembers(departmentId);
  return (
    <MemberList
      members={members}
      isLoading={isLoading}
      contextLabel={departmentName}
      emptyTitle="Phòng ban này chưa có nhân sự nào"
    />
  );
}
