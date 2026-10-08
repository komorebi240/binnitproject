"use client";

import { useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
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
import { useCatalog, useDriveStatus, useRegisterFolder } from "../hooks/useDrive";
import type { CatalogFolder } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
interface FolderCatalogProps {
  currentUser: UserProfile;
}

export function FolderCatalog({ currentUser }: FolderCatalogProps) {
  const { t } = useI18n();
  const { data: catalog, isLoading } = useCatalog();
  const { data: departments } = useDepartments();
  const { data: driveStatus } = useDriveStatus();
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
      showToast("success", t("drive.folderCatalog.folderRegistered"));
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("drive.folderCatalog.couldnTRegisterTheFolder"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Skeleton rows={2} />
      ) : (
        <Table<CatalogFolder>
          columns={[
            {
              header: "Folder",
              cell: (f) => (
                <a
                  href={`https://drive.google.com/drive/folders/${f.googleFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {f.googleFolderName}
                  <ArrowSquareOut size={14} aria-hidden />
                </a>
              ),
            },
            { header: t("drive.folderCatalog.department"), cell: (f) => f.departmentName },
          ]}
          rows={catalog ?? []}
          getRowKey={(f) => f.id}
          emptyState={
            <EmptyState title={t("drive.folderCatalog.noFoldersRegisteredYet")} description={t("drive.folderCatalog.registerTheFirstFolderWithThe")} />
          }
        />
      )}

      {driveStatus && !driveStatus.connected ? (
        <p className="rounded border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">
          {t("drive.folderCatalog.connectYourGoogleDriveInThe")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-line p-4 sm:flex-row sm:items-end [.pane-narrow_&]:sm:flex-col [.pane-narrow_&]:sm:items-stretch">
          <div className="flex-1">
            <Input
              label={t("drive.folderCatalog.googleDriveFolderLinkOrId")}
              value={folderLinkOrId}
              onChange={(e) => setFolderLinkOrId(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
            />
          </div>
          {isExecutive && (
            <div className="sm:w-56">
              <Select
                label={t("common.departments")}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={[
                  { value: "", label: t("common.chooseADepartment") },
                  ...(departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
                ]}
                required
              />
            </div>
          )}
          <Button type="submit" loading={registerFolder.isPending}>
            {t("drive.folderCatalog.registerFolder")}
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
