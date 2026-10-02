"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useDeleteDepartment, useDepartments } from "../hooks/useOrganization";
import { DepartmentMemberList } from "./DepartmentMemberList";
import { TeamPanel, canManageDepartmentTeams } from "./TeamPanel";

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
  const { data: currentUser } = useCurrentUser();
  const { data: departments, isLoading } = useDepartments();
  const deleteDepartment = useDeleteDepartment();
  const { showToast } = useToast();

  const department = departments?.find((d) => d.id === departmentId);

  function handleDelete() {
    deleteDepartment.mutate(departmentId, {
      onSuccess: () => {
        showToast("success", "Đã xoá phòng ban");
        onDeleted();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được phòng ban"),
    });
  }

  if (isLoading || !currentUser) {
    return <Skeleton rows={4} />;
  }

  if (!department) {
    return <p className="text-sm text-gray-500">Không tìm thấy phòng ban.</p>;
  }

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="flex flex-col gap-3 rounded border border-gray-200 bg-surface p-5 shadow-sm md:w-1/4">
        <span className="gradient-surface flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primaryEnd text-lg font-semibold text-primary-foreground">
          {department.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-xl font-semibold text-gray-900">{department.name}</h1>
        <p className="text-sm text-gray-600">{department.description ?? "Chưa có mô tả."}</p>
        {isExecutive && (
          <Button variant="danger" onClick={handleDelete} loading={deleteDepartment.isPending}>
            Xoá phòng ban
          </Button>
        )}
      </aside>

      <div className="flex flex-col gap-6 md:w-3/4">
        <section className="flex flex-col gap-3 rounded border border-gray-200 bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Nhân sự</h2>
          <DepartmentMemberList departmentId={departmentId} departmentName={department.name} />
        </section>

        <TeamPanel
          departmentId={departmentId}
          departmentName={department.name}
          canManage={canManageDepartmentTeams(currentUser.authorityLevel, currentUser.departmentId, departmentId)}
        />
      </div>
    </div>
  );
}
