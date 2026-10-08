"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import {
  useAccessRequests,
  useApproveAccessRequest,
  useCatalog,
  useCreateAccessRequest,
  useRejectAccessRequest,
} from "../hooks/useDrive";
import type { FolderAccessRequest, FolderRequestStatus } from "../types";

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_KEYS: Record<FolderRequestStatus, TranslationKey> = {
  PENDING: "drive.accessRequestPanel.pending",
  APPROVED: "drive.accessRequestPanel.approved",
  REJECTED: "common.declined",
};

const STATUS_TONE: Record<FolderRequestStatus, "info" | "success" | "danger"> = {
  PENDING: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

/** Mirrors FolderAccessRequestServiceImpl.assertCanDecide - UX only, backend re-checks
 * independently (CLAUDE.md section 9). */
function canDecide(currentUser: UserProfile, request: FolderAccessRequest): boolean {
  return (
    currentUser.authorityLevel === "EXECUTIVE" ||
    (currentUser.authorityLevel === "DEPARTMENT_HEAD" && request.ownerDepartmentId === currentUser.departmentId)
  );
}

interface AccessRequestPanelProps {
  currentUser: UserProfile;
}

export function AccessRequestPanel({ currentUser }: AccessRequestPanelProps) {
  const { t } = useI18n();
  const { data: requests, isLoading } = useAccessRequests();
  const { data: catalog } = useCatalog();
  const createRequest = useCreateAccessRequest();
  const approve = useApproveAccessRequest();
  const reject = useRejectAccessRequest();
  const { showToast } = useToast();

  const [catalogFolderId, setCatalogFolderId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Only makes sense to request access to another department's folder - mirrors the backend's
  // OWN_DEPARTMENT_FOLDER rule.
  const requestableFolders = (catalog ?? []).filter((f) => f.departmentId !== currentUser.departmentId);
  const canRequest = currentUser.authorityLevel !== "EXECUTIVE";

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createRequest.mutateAsync({ catalogFolderId: Number(catalogFolderId) });
      setCatalogFolderId("");
      showToast("success", t("drive.accessRequestPanel.requestSent"));
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("common.couldnTSendTheRequest"));
    }
  }

  function handleApprove(id: number) {
    approve.mutate(id, {
      onSuccess: () => showToast("success", t("drive.accessRequestPanel.requestApproved")),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("drive.accessRequestPanel.couldnTApproveTheRequest")),
    });
  }

  function handleReject(id: number) {
    reject.mutate(id, {
      onSuccess: () => showToast("success", t("drive.accessRequestPanel.requestDeclined")),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("drive.accessRequestPanel.couldnTDeclineTheRequest")),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Skeleton rows={2} />
      ) : (
        <Table<FolderAccessRequest>
          columns={[
            { header: "Folder", cell: (r) => r.googleFolderName ?? "-" },
            { header: t("drive.accessRequestPanel.department"), cell: (r) => r.ownerDepartmentName ?? "-" },
            { header: t("drive.accessRequestPanel.requestedBy"), cell: (r) => `${r.requesterUserName} (${r.requesterDepartmentName})` },
            { header: t("common.status"), cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(STATUS_KEYS[r.status])}</Badge> },
            {
              header: "",
              cell: (r) =>
                r.status === "PENDING" && canDecide(currentUser, r) ? (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(r.id)} loading={approve.isPending}>
                      {t("common.approve")}
                    </Button>
                    <Button variant="danger" onClick={() => handleReject(r.id)} loading={reject.isPending}>
                      {t("common.decline")}
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          rows={requests ?? []}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title={t("drive.accessRequestPanel.noFolderAccessRequestsYet")}
              description={canRequest ? t("drive.accessRequestPanel.sendTheFirstRequestWithThe") : undefined}
            />
          }
        />
      )}

      {canRequest && (
        <form onSubmit={handleCreate} className="flex items-end gap-2 rounded border border-line p-4">
          <div className="flex-1">
            <Select
              label={t("drive.accessRequestPanel.requestAccessToAFolder")}
              value={catalogFolderId}
              onChange={(e) => setCatalogFolderId(e.target.value)}
              options={[
                { value: "", label: t("drive.accessRequestPanel.chooseAFolder") },
                ...requestableFolders.map((f) => ({
                  value: String(f.id),
                  label: `${f.googleFolderName} (${f.departmentName})`,
                })),
              ]}
              required
            />
          </div>
          <Button type="submit" loading={createRequest.isPending}>
            {t("drive.accessRequestPanel.sendRequest")}
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
