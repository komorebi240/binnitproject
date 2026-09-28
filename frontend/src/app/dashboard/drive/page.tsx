"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { DrivePanel } from "@/features/drive/components/DrivePanel";

const DRIVE_ERROR_LABELS: Record<string, string> = {
  expired_or_invalid_state: "Phiên kết nối đã hết hạn, vui lòng thử lại.",
  no_refresh_token: "Google không cấp quyền truy cập lâu dài — thử ngắt kết nối trong tài khoản Google rồi kết nối lại.",
  missing_code: "Kết nối bị huỷ hoặc thiếu thông tin từ Google.",
  connection_failed: "Kết nối Google Drive thất bại.",
  access_denied: "Bạn đã từ chối cấp quyền trên Google.",
};

function DriveCallbackBanner() {
  const searchParams = useSearchParams();
  const driveConnected = searchParams.get("drive") === "connected";
  const driveError = searchParams.get("error");

  if (!driveConnected && !driveError) return null;

  return (
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
  );
}

export default function DrivePage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <>
      <Suspense fallback={null}>
        <DriveCallbackBanner />
      </Suspense>
      <DrivePanel currentUser={currentUser} />
    </>
  );
}
