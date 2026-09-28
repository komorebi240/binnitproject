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

const STATUS_LABELS: Record<FolderRequestStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

const STATUS_TONE: Record<FolderRequestStatus, "info" | "success" | "danger"> = {
  PENDING: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

/** Mirrors FolderAccessRequestServiceImpl.assertCanDecide — UX only, backend re-checks
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
  const { data: requests, isLoading } = useAccessRequests();
  const { data: catalog } = useCatalog();
  const createRequest = useCreateAccessRequest();
  const approve = useApproveAccessRequest();
  const reject = useRejectAccessRequest();
  const { showToast } = useToast();

  const [catalogFolderId, setCatalogFolderId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Only makes sense to request access to another department's folder — mirrors the backend's
  // OWN_DEPARTMENT_FOLDER rule.
  const requestableFolders = (catalog ?? []).filter((f) => f.departmentId !== currentUser.departmentId);
  const canRequest = currentUser.authorityLevel !== "EXECUTIVE";

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createRequest.mutateAsync({ catalogFolderId: Number(catalogFolderId) });
      setCatalogFolderId("");
      showToast("success", "Đã gửi yêu cầu");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không gửi được yêu cầu");
    }
  }

  function handleApprove(id: number) {
    approve.mutate(id, {
      onSuccess: () => showToast("success", "Đã duyệt yêu cầu"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không duyệt được yêu cầu"),
    });
  }

  function handleReject(id: number) {
    reject.mutate(id, {
      onSuccess: () => showToast("success", "Đã từ chối yêu cầu"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không từ chối được yêu cầu"),
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
            { header: "Thuộc phòng", cell: (r) => r.ownerDepartmentName ?? "-" },
            { header: "Người xin", cell: (r) => `${r.requesterUserName} (${r.requesterDepartmentName})` },
            { header: "Trạng thái", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABELS[r.status]}</Badge> },
            {
              header: "",
              cell: (r) =>
                r.status === "PENDING" && canDecide(currentUser, r) ? (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(r.id)} loading={approve.isPending}>
                      Duyệt
                    </Button>
                    <Button variant="danger" onClick={() => handleReject(r.id)} loading={reject.isPending}>
                      Từ chối
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          rows={requests ?? []}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="Chưa có yêu cầu truy cập folder nào"
              description={canRequest ? "Gửi yêu cầu đầu tiên bằng form bên dưới." : undefined}
            />
          }
        />
      )}

      {canRequest && (
        <form onSubmit={handleCreate} className="flex items-end gap-2 rounded border border-gray-200 p-4">
          <div className="flex-1">
            <Select
              label="Xin quyền vào folder"
              value={catalogFolderId}
              onChange={(e) => setCatalogFolderId(e.target.value)}
              options={[
                { value: "", label: "-- Chọn folder --" },
                ...requestableFolders.map((f) => ({
                  value: String(f.id),
                  label: `${f.googleFolderName} (${f.departmentName})`,
                })),
              ]}
              required
            />
          </div>
          <Button type="submit" loading={createRequest.isPending}>
            Gửi yêu cầu
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
