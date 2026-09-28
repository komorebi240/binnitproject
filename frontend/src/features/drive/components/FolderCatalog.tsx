"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useDepartments } from "@/features/organization/hooks/useOrganization";
import { useCatalog, useRegisterFolder } from "../hooks/useDrive";
import type { CatalogFolder } from "../types";

interface FolderCatalogProps {
  currentUser: UserProfile;
}

export function FolderCatalog({ currentUser }: FolderCatalogProps) {
  const { data: catalog, isLoading } = useCatalog();
  const { data: departments } = useDepartments();
  const registerFolder = useRegisterFolder();
  const { showToast } = useToast();

  const [folderLinkOrId, setFolderLinkOrId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await registerFolder.mutateAsync({
        folderLinkOrId,
        departmentId: isExecutive && departmentId ? Number(departmentId) : undefined,
      });
      setFolderLinkOrId("");
      showToast("success", "Đã đăng ký folder");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không đăng ký được folder");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Skeleton rows={2} />
      ) : (
        <Table<CatalogFolder>
          columns={[
            { header: "Folder", cell: (f) => f.googleFolderName },
            { header: "Thuộc phòng ban", cell: (f) => f.departmentName },
          ]}
          rows={catalog ?? []}
          getRowKey={(f) => f.id}
          emptyState={
            <EmptyState title="Chưa có folder nào được đăng ký" description="Đăng ký folder đầu tiên bằng form bên dưới." />
          }
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Link hoặc ID folder Google Drive"
            value={folderLinkOrId}
            onChange={(e) => setFolderLinkOrId(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            required
          />
        </div>
        {isExecutive && (
          <div className="sm:w-56">
            <Select
              label="Phòng ban"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[
                { value: "", label: "-- Chọn phòng ban --" },
                ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
              ]}
              required
            />
          </div>
        )}
        <Button type="submit" loading={registerFolder.isPending}>
          Đăng ký folder
        </Button>
      </form>
      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <p className="text-xs text-gray-500">
        Cần kết nối Google Drive trước khi đăng ký folder — xem mục phía trên.
      </p>
    </div>
  );
}
