"use client";

import type { UserProfile } from "@/features/auth/types";
import { AccessRequestPanel } from "./AccessRequestPanel";
import { ConnectDriveButton } from "./ConnectDriveButton";
import { FolderCatalog } from "./FolderCatalog";

interface DrivePanelProps {
  currentUser: UserProfile;
}

export function DrivePanel({ currentUser }: DrivePanelProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Google Drive</h2>
        <ConnectDriveButton />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Danh mục folder theo phòng ban</h3>
        <FolderCatalog currentUser={currentUser} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Yêu cầu truy cập chéo phòng ban</h3>
        <AccessRequestPanel currentUser={currentUser} />
      </div>
    </section>
  );
}
