"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCreateDepartment, useDeleteDepartment, useDepartments } from "../hooks/useOrganization";
import type { Department } from "../types";
import { TeamPanel, canManageDepartmentTeams } from "./TeamPanel";

interface DepartmentManagerProps {
  currentUser: UserProfile;
}

export function DepartmentManager({ currentUser }: DepartmentManagerProps) {
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createDepartment.mutateAsync(name);
      setName("");
      showToast("success", "Đã tạo phòng ban");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không tạo được phòng ban");
    }
  }

  function handleDelete(departmentId: number) {
    deleteDepartment.mutate(departmentId, {
      onSuccess: () => showToast("success", "Đã xoá phòng ban"),
      onError: (err) =>
        showToast("error", err instanceof ApiRequestError ? err.message : "Không xoá được phòng ban"),
    });
  }

  const selectedDepartment = departments?.find((d) => d.id === selectedDepartmentId);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Phòng ban</h2>

      {isLoading ? (
        <Skeleton />
      ) : (
        <Table<Department>
          columns={[
            { header: "Tên phòng ban", cell: (d) => d.name },
            {
              header: "",
              cell: (d) => (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSelectedDepartmentId(d.id)}>
                    Xem nhóm
                  </Button>
                  {isExecutive && (
                    <Button variant="danger" onClick={() => handleDelete(d.id)} loading={deleteDepartment.isPending}>
                      Xoá
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={departments ?? []}
          getRowKey={(d) => d.id}
          emptyState={
            <EmptyState
              title="Chưa có phòng ban nào"
              description={isExecutive ? "Tạo phòng ban đầu tiên bên dưới." : undefined}
            />
          }
        />
      )}

      {isExecutive && (
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Tên phòng ban mới"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" loading={createDepartment.isPending}>
            Tạo phòng ban
          </Button>
        </form>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}

      {selectedDepartment && (
        <TeamPanel
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          canManage={canManageDepartmentTeams(
            currentUser.authorityLevel,
            currentUser.departmentId,
            selectedDepartment.id,
          )}
        />
      )}
    </section>
  );
}
