"use client";

import { Alert } from "@/components/ui/Alert";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { DrivePanel } from "./DrivePanel";

import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
const DRIVE_ERROR_KEYS: Record<string, TranslationKey> = {
  expired_or_invalid_state: "drive.driveTabContent.theConnectionSessionExpiredPleaseTry",
  no_refresh_token: "drive.driveTabContent.googleDidnTGrantLongTerm",
  missing_code: "drive.driveTabContent.theConnectionWasCancelledOrGoogle",
  connection_failed: "drive.driveTabContent.connectingGoogleDriveFailed",
  access_denied: "drive.driveTabContent.youDeclinedAccessOnGoogle",
};

interface DriveTabContentProps {
  /** Were `?drive=connected` / `?error=...` (set by the backend's OAuth callback redirect) -
   * passed in explicitly now that tabs aren't URL-driven. */
  driveConnected: boolean;
  driveError: string | null;
}

export function DriveTabContent({ driveConnected, driveError }: DriveTabContentProps) {
  const { t } = useI18n();
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <>
      {(driveConnected || driveError) && (
        <div className="mb-4">
          {driveConnected && (
            <Alert tone="success">{t("drive.driveTabContent.googleDriveConnectedSuccessfully")}</Alert>
          )}
          {driveError && (
            <Alert tone="danger">{DRIVE_ERROR_KEYS[driveError] ? t(DRIVE_ERROR_KEYS[driveError]) : t("drive.driveTabContent.connectingGoogleDriveFailedDriveerror", { driveError })}</Alert>
          )}
        </div>
      )}
      <DrivePanel currentUser={currentUser} />
    </>
  );
}
