"use client";

import { useDepartmentMembers } from "../hooks/useOrganization";
import { MemberList } from "./MemberList";

import { useI18n } from "@/lib/i18n/useI18n";
interface DepartmentMemberListProps {
  departmentId: number;
  departmentName: string;
}

/**
 * Internal company directory for one department (Phase 7 plan) - readable by anyone, not just
 * managers (see OrganizationService.listDepartmentMembers). Rendering itself lives in
 * MemberList, shared with TeamMemberList.
 */
export function DepartmentMemberList({ departmentId, departmentName }: DepartmentMemberListProps) {
  const { t } = useI18n();
  const { data: members, isLoading } = useDepartmentMembers(departmentId);
  return (
    <MemberList
      members={members}
      isLoading={isLoading}
      contextLabel={departmentName}
      emptyTitle={t("organization.departmentMemberList.thisDepartmentHasNoStaffYet")}
    />
  );
}
