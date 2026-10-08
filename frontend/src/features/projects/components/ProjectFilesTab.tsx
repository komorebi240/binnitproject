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

import { useI18n, type I18n } from "@/lib/i18n/useI18n";
function describeShare(share: FolderShareResult, t: I18n["t"]): string {
  const parts = [t("projects.projectFilesTab.sharedWithCount", { count: share.granted })];
  if (share.notConnected > 0) parts.push(t("projects.projectFilesTab.notConnectedCount", { count: share.notConnected }));
  if (share.failed > 0) parts.push(t("projects.projectFilesTab.refusedCount", { count: share.failed }));
  return parts.join("; ");
}

function LinkFolderDialog({ project, currentUser, onClose }: { project: ProjectDetail; currentUser: UserProfile; onClose: () => void }) {
  const { t } = useI18n();
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
        showToast("success", describeShare(result.share, t));
        onClose();
      },
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectFilesTab.couldnTAttachTheFolder")),
    });
  }

  return (
    <Modal title={t("projects.projectFilesTab.attachADriveFolderToThe")} onClose={onClose}>
      <p className="text-sm text-fg-soft">
        {t("projects.projectFilesTab.projectMembersWillBeGivenAccess")}
      </p>
      {isLoading ? (
        <p className="py-4 text-center text-sm text-fg-faint">{t("common.loading")}</p>
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-muted">
          {t("projects.projectFilesTab.noFolderToAttachRegisterYour")}
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {candidates.map((folder) => (
            <li key={folder.id} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-muted">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{folder.googleFolderName}</span>
                <span className="block truncate text-xs text-fg-muted">{folder.departmentName}</span>
              </span>
              <Button variant="secondary" onClick={() => handleLink(folder.id)} disabled={link.isPending}>
                {t("projects.projectFilesTab.attach")}
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
  const { t } = useI18n();
  const unlink = useUnlinkProjectFolder(project.id);
  const { showToast } = useToast();
  const [linking, setLinking] = useState(false);

  function handleUnlink(linkId: number) {
    unlink.mutate(linkId, {
      onSuccess: () => showToast("success", t("projects.projectFilesTab.folderRemovedFromTheProjectAccess")),
      onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("projects.projectFilesTab.couldnTRemoveTheFolder")),
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{t("projects.projectFilesTab.sharedDriveFolders")}</h2>
        {project.canManage && (
          <Button variant="secondary" onClick={() => setLinking(true)}>
            {t("projects.projectFilesTab.attachFolder")}
          </Button>
        )}
      </div>

      {project.folders.length === 0 ? (
        <EmptyState
          title={t("projects.projectFilesTab.noFolderAttachedYet")}
          description={project.canManage ? t("projects.projectFilesTab.attachAFolderFromTheDrive") : t("projects.projectFilesTab.theProjectSLeadWillAttach")}
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {project.folders.map((folder) => (
            <li key={folder.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <FolderSimple size={20} aria-hidden className="shrink-0 text-primary-text" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{folder.folderName}</span>
                  <span className="block truncate text-xs text-fg-muted">{t("projects.projectFilesTab.from")} {folder.departmentName}</span>
                </span>
              </span>
              <span className="flex gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${encodeURIComponent(folder.googleFolderId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded bg-surface-muted px-3 py-1.5 text-sm font-medium text-fg-soft hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t("projects.projectFilesTab.openInDrive")}
                </a>
                {project.canManage && (
                  <Button variant="danger" onClick={() => handleUnlink(folder.id)} loading={unlink.isPending}>
                    {t("common.remove")}
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
