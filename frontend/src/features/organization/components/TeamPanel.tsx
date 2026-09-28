"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { AuthorityLevel } from "@/features/auth/types";
import { useCreateTeam, useDeleteTeam, useTeams } from "../hooks/useOrganization";
import type { Team } from "../types";

interface TeamPanelProps {
  departmentId: number;
  departmentName: string;
  /** Only EXECUTIVE and the DEPARTMENT_HEAD of this exact department may create/delete teams
   * — this only controls whether the controls are shown; the backend re-checks independently
   * (CLAUDE.md section 9). */
  canManage: boolean;
}

export function TeamPanel({ departmentId, departmentName, canManage }: TeamPanelProps) {
  const { data: teams, isLoading } = useTeams(departmentId);
  const createTeam = useCreateTeam(departmentId);
  const deleteTeam = useDeleteTeam(departmentId);
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createTeam.mutateAsync(name);
      setName("");
      showToast("success", "Đã tạo nhóm");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không tạo được nhóm");
    }
  }

  function handleDelete(teamId: number) {
    deleteTeam.mutate(teamId, {
      onSuccess: () => showToast("success", "Đã xoá nhóm"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được nhóm"),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Nhóm trong phòng &quot;{departmentName}&quot;</h3>

      {isLoading ? (
        <Skeleton rows={2} />
      ) : (
        <Table<Team>
          columns={[
            { header: "Tên nhóm", cell: (t) => t.name },
            ...(canManage
              ? [
                  {
                    header: "",
                    cell: (t: Team) => (
                      <Button variant="danger" onClick={() => handleDelete(t.id)} loading={deleteTeam.isPending}>
                        Xoá
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
          rows={teams ?? []}
          getRowKey={(t) => t.id}
          emptyState={
            <EmptyState
              title="Chưa có nhóm nào trong phòng ban này"
              description={canManage ? "Tạo nhóm đầu tiên bên dưới." : undefined}
            />
          }
        />
      )}

      {canManage && (
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Tên nhóm mới" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" loading={createTeam.isPending}>
            Tạo nhóm
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
