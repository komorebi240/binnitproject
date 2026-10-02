"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useDeleteDepartment, useDepartments } from "@/features/organization/hooks/useOrganization";
import { DepartmentMemberList } from "@/features/organization/components/DepartmentMemberList";
import { TeamPanel, canManageDepartmentTeams } from "@/features/organization/components/TeamPanel";

/** 1/4–3/4 split (Phase 7 plan): department identity on the left, directory + teams on the right. */
export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const departmentId = Number(params.id);
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: departments, isLoading } = useDepartments();
  const deleteDepartment = useDeleteDepartment();
  const { showToast } = useToast();

  const department = departments?.find((d) => d.id === departmentId);

  function handleDelete() {
    deleteDepartment.mutate(departmentId, {
      onSuccess: () => {
        showToast("success", "Đã xoá phòng ban");
        router.push("/dashboard/departments");
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
      <aside className="flex flex-col gap-3 md:w-1/4">
        <h1 className="text-lg font-semibold text-gray-900">{department.name}</h1>
        <p className="text-sm text-gray-600">{department.description ?? "Chưa có mô tả."}</p>
        {isExecutive && (
          <Button variant="danger" onClick={handleDelete} loading={deleteDepartment.isPending}>
            Xoá phòng ban
          </Button>
        )}
      </aside>

      <div className="flex flex-col gap-6 md:w-3/4">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Nhân sự</h2>
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
