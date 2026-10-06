"use client";

import { useState } from "react";
import { FolderSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useCatalog } from "@/features/drive/hooks/useDrive";
import { useLinkProjectFolder, useUnlinkProjectFolder } from "../hooks/useProjects";
import type { FolderShareResult, ProjectDetail } from "../types";

function describeShare(share: FolderShareResult): string {
  const parts = [`Đã chia sẻ cho ${share.granted} người`];
  if (share.notConnected > 0) parts.push(`${share.notConnected} người chưa kết nối Google Drive`);
  if (share.failed > 0) parts.push(`${share.failed} người Google từ chối`);
  return parts.join("; ");
}

function LinkFolderDialog({ project, currentUser, onClose }: { project: ProjectDetail; currentUser: UserProfile; onClose: () => void }) {
  const { data: catalog, isLoading } = useCatalog();
  const link = useLinkProjectFolder(project.id);
  const { showToast } = useToast();

  // The server only lets an executive or the folder's own department head share it; offer just those folders.
  const linked = new Set(project.folders.map((f) => f.catalogFolderId));
  const candidates = (catalog ?? []).filter(
    (folder) => !linked.has(folder.id) && (currentUser.authorityLevel === "EXECUTIVE" || folder.departmentId === currentUser.departmentId),
  );

  function handleLink(folderId: number) {
    link.mutate(folderId, {
      onSuccess: (result) => {
        showToast("success", describeShare(result.share));
        onClose();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không gắn được thư mục"),
    });
  }

  return (
    <Modal title="Gắn thư mục Drive vào dự án" onClose={onClose}>
      <p className="text-sm text-gray-600">
        Thành viên dự án sẽ được cấp quyền xem thư mục này (người chưa kết nối Google Drive sẽ cần kết nối rồi nhờ bạn thêm lại).
      </p>
      {isLoading ? (
        <p className="py-4 text-center text-sm text-gray-400">Đang tải...</p>
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          Không có thư mục nào để gắn. Đăng ký thư mục của phòng ban ở trang Google Drive trước.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {candidates.map((folder) => (
            <li key={folder.id} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-muted">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-900">{folder.googleFolderName}</span>
                <span className="block truncate text-xs text-gray-500">{folder.departmentName}</span>
              </span>
              <Button variant="secondary" onClick={() => handleLink(folder.id)} disabled={link.isPending}>
                Gắn
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Drive folders the whole project shares (picked from the departments' Drive catalog). */
export function ProjectFilesTab({ project, currentUser }: { project: ProjectDetail; currentUser: UserProfile }) {
  const unlink = useUnlinkProjectFolder(project.id);
  const { showToast } = useToast();
  const [linking, setLinking] = useState(false);

  function handleUnlink(linkId: number) {
    unlink.mutate(linkId, {
      onSuccess: () => showToast("success", "Đã gỡ thư mục khỏi dự án (quyền đã cấp trong Drive vẫn giữ nguyên)"),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không gỡ được thư mục"),
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Thư mục Drive chung</h2>
        {project.canManage && (
          <Button variant="secondary" onClick={() => setLinking(true)}>
            Gắn thư mục
          </Button>
        )}
      </div>

      {project.folders.length === 0 ? (
        <EmptyState
          title="Chưa gắn thư mục nào"
          description={project.canManage ? "Gắn một thư mục từ danh mục Drive để cả dự án cùng dùng." : "Người phụ trách dự án sẽ gắn thư mục."}
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {project.folders.map((folder) => (
            <li key={folder.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <FolderSimple size={20} aria-hidden className="shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">{folder.folderName}</span>
                  <span className="block truncate text-xs text-gray-500">Của {folder.departmentName}</span>
                </span>
              </span>
              <span className="flex gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${encodeURIComponent(folder.googleFolderId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded bg-surface-muted px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Mở trong Drive
                </a>
                {project.canManage && (
                  <Button variant="danger" onClick={() => handleUnlink(folder.id)} loading={unlink.isPending}>
                    Gỡ
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {linking && <LinkFolderDialog project={project} currentUser={currentUser} onClose={() => setLinking(false)} />}
    </section>
  );
}
