"use client";

import { useRef } from "react";
import { Avatar, STATUS_LABELS } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useUpdatePresence, useUploadAvatar } from "@/features/auth/hooks/useAuth";
import type { PresenceStatus, UserProfile } from "@/features/auth/types";

const STATUS_OPTIONS: PresenceStatus[] = ["ONLINE", "LIMITED", "DO_NOT_DISTURB"];

const STATUS_DOT_CLASSES: Record<PresenceStatus, string> = {
  ONLINE: "bg-green-500",
  LIMITED: "bg-yellow-500",
  DO_NOT_DISTURB: "bg-red-500",
};

interface ProfileAvatarFormProps {
  currentUser: UserProfile;
}

/**
 * Avatar upload + presence status — both self-service, both purely about how this user presents
 * to others (see Avatar.tsx / backend PresenceStatus javadoc: status is a display signal only,
 * it never filters real notifications).
 */
export function ProfileAvatarForm({ currentUser }: ProfileAvatarFormProps) {
  const uploadAvatar = useUploadAvatar();
  const updatePresence = useUpdatePresence();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    try {
      await uploadAvatar.mutateAsync(file);
      showToast("success", "Đã cập nhật ảnh đại diện");
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : "Không tải lên được ảnh đại diện");
    }
  }

  function handleStatusChange(status: PresenceStatus) {
    updatePresence.mutate(status, {
      onError: (err) =>
        showToast("error", err instanceof ApiRequestError ? err.message : "Không đổi được trạng thái"),
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Hồ sơ</h2>

      <div className="flex items-center gap-4">
        <Avatar avatarUrl={currentUser.avatarUrl} fullName={currentUser.fullName} size="lg" />
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {uploadAvatar.isPending ? "Đang tải lên..." : "Đổi ảnh đại diện"}
          </button>
          <p className="mt-1 text-xs text-gray-500">PNG, JPEG hoặc WebP, tối đa 2MB.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Trạng thái</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => {
            const isSelected = currentUser.presenceStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                aria-pressed={isSelected}
                disabled={updatePresence.isPending}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-all duration-150
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50
                  ${isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-gray-300 hover:border-gray-400"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASSES[status]}`} aria-hidden />
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
