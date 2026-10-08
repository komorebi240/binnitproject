"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlusButton } from "@/components/ui/PlusButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useDeleteDepartment, useDepartments } from "../hooks/useOrganization";
import { DepartmentAvatar } from "../departmentAppearance";
import { DepartmentEditDialog } from "./DepartmentEditDialog";
import { DepartmentMemberList } from "./DepartmentMemberList";
import { AddExistingStaffDialog } from "./AddExistingStaffDialog";
import { TeamPanel, canManageDepartmentTeams } from "./TeamPanel";

import { useI18n } from "@/lib/i18n/useI18n";
interface DepartmentDetailViewProps {
  departmentId: number;
  /** Where to send the active tab after a successful delete - a real route push doesn't apply
   * anymore (tabs aren't URL-driven), so the caller (TabContentRenderer) decides. */
  onDeleted: () => void;
}

/** 1/4-3/4 split (Phase 7 plan) - extracted from the old app/dashboard/departments/[id]/page.tsx
 * (which read the id via useParams()) so it can be rendered per-tab with an explicit prop
 * instead, now that tabs don't correspond to real Next.js routes. */
export function DepartmentDetailView({ departmentId, onDeleted }: DepartmentDetailViewProps) {
  const { t } = useI18n();
  const { data: currentUser } = useCurrentUser();
  const { data: departments, isLoading } = useDepartments();
  const deleteDepartment = useDeleteDepartment();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);

  const department = departments?.find((d) => d.id === departmentId);

  function handleDelete() {
    deleteDepartment.mutate(departmentId, {
      onSuccess: () => {
        showToast("success", t("organization.departmentDetailView.departmentDeleted"));
        onDeleted();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("organization.departmentDetailView.couldnTDeleteTheDepartment")),
    });
  }

  if (isLoading || !currentUser) {
    return <Skeleton rows={4} />;
  }

  if (!department) {
    return <p className="text-sm text-fg-muted">{t("organization.departmentDetailView.departmentNotFound")}</p>;
  }

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
  const canEdit = isExecutive || (currentUser.authorityLevel === "DEPARTMENT_HEAD" && currentUser.departmentId === departmentId);

  return (
    <div className="flex flex-col gap-6 md:flex-row [.pane-narrow_&]:md:flex-col">
      <aside className="flex flex-col gap-3 rounded glass-card p-5 md:w-1/4 [.pane-narrow_&]:md:w-full">
        <DepartmentAvatar department={department} size="lg" />
        <h1 className="text-xl font-semibold text-fg">{department.name}</h1>
        <p className="text-sm text-fg-soft">{department.description ?? t("common.noDescriptionYet")}</p>
        {canEdit && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t("organization.departmentDetailView.edit")}
          </Button>
        )}
        {isExecutive && (
          <Button variant="danger" onClick={handleDelete} loading={deleteDepartment.isPending}>
            {t("organization.departmentDetailView.deleteDepartment")}
          </Button>
        )}
      </aside>

      <div className="flex flex-col gap-6 md:w-3/4 [.pane-narrow_&]:md:w-full">
        <section className="flex flex-col gap-3 rounded glass-card p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-fg">{t("common.staff")}</h2>
            {canEdit && <PlusButton label={t("organization.departmentDetailView.addExistingStaffToTheDepartment")} onClick={() => setAddingStaff(true)} />}
          </div>
          <DepartmentMemberList departmentId={departmentId} departmentName={department.name} />
        </section>

        <TeamPanel
          departmentId={departmentId}
          departmentName={department.name}
          canManage={canManageDepartmentTeams(currentUser.authorityLevel, currentUser.departmentId, departmentId)}
        />
      </div>
      {addingStaff && (
        <AddExistingStaffDialog departmentId={departmentId} departmentName={department.name} onClose={() => setAddingStaff(false)} />
      )}
      {editing && <DepartmentEditDialog department={department} onClose={() => setEditing(false)} />}
    </div>
  );
}
