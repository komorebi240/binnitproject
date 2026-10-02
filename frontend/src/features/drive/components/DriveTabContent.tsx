"use client";

import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { DrivePanel } from "./DrivePanel";

const DRIVE_ERROR_LABELS: Record<string, string> = {
  expired_or_invalid_state: "Phiên kết nối đã hết hạn, vui lòng thử lại.",
  no_refresh_token: "Google không cấp quyền truy cập lâu dài - thử ngắt kết nối trong tài khoản Google rồi kết nối lại.",
  missing_code: "Kết nối bị huỷ hoặc thiếu thông tin từ Google.",
  connection_failed: "Kết nối Google Drive thất bại.",
  access_denied: "Bạn đã từ chối cấp quyền trên Google.",
};

interface DriveTabContentProps {
  /** Were `?drive=connected` / `?error=...` (set by the backend's OAuth callback redirect) -
   * passed in explicitly now that tabs aren't URL-driven. */
  driveConnected: boolean;
  driveError: string | null;
}

export function DriveTabContent({ driveConnected, driveError }: DriveTabContentProps) {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <>
      {(driveConnected || driveError) && (
        <div className="mb-4">
          {driveConnected && (
            <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">
              Đã kết nối Google Drive thành công.
            </p>
          )}
          {driveError && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-danger">
              {DRIVE_ERROR_LABELS[driveError] ?? `Kết nối Google Drive thất bại (${driveError}).`}
            </p>
          )}
        </div>
      )}
      <DrivePanel currentUser={currentUser} />
    </>
  );
}
