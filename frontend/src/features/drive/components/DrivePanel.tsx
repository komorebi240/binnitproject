"use client";

import type { UserProfile } from "@/features/auth/types";
import { AccessRequestPanel } from "./AccessRequestPanel";
import { ConnectDriveButton } from "./ConnectDriveButton";
import { FolderCatalog } from "./FolderCatalog";

import { useI18n } from "@/lib/i18n/useI18n";
interface DrivePanelProps {
  currentUser: UserProfile;
}

export function DrivePanel({ currentUser }: DrivePanelProps) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">Google Drive</h2>
        <ConnectDriveButton />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-fg-soft">{t("drive.drivePanel.folderCatalogByDepartment")}</h3>
        <FolderCatalog currentUser={currentUser} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-fg-soft">{t("drive.drivePanel.crossDepartmentAccessRequests")}</h3>
        <AccessRequestPanel currentUser={currentUser} />
      </div>
    </section>
  );
}
