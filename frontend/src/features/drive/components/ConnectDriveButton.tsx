"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDriveStatus } from "../hooks/useDrive";

import { useI18n } from "@/lib/i18n/useI18n";
/**
 * OAuth is a full-page redirect flow, not something axios/XHR can do - clicking this button
 * navigates the whole browser to the backend's /drive/connect, which redirects again to
 * Google's consent screen (see backend DriveConnectionController's javadoc).
 */
export function ConnectDriveButton() {
  const { t } = useI18n();
  const { data: status, isLoading } = useDriveStatus();

  function handleConnect() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    window.location.href = `${apiBase}/drive/connect`;
  }

  if (isLoading) {
    return <p className="text-sm text-fg-muted">{t("common.loading")}</p>;
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="success">{t("drive.connectDriveButton.connected")}</Badge>
        <span className="text-sm text-fg-soft">{status.googleEmail}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone="warning">{t("drive.connectDriveButton.notConnected")}</Badge>
      <Button variant="secondary" onClick={handleConnect}>
        {t("common.connectGoogleDrive")}
      </Button>
    </div>
  );
}
