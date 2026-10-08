"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, PRESENCE_STATUS_KEYS } from "@/components/ui/Avatar";
import { LEVEL_SHORT_LABEL_KEYS } from "@/features/onboarding/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useLogout, useUpdatePresence, useUploadAvatar } from "@/features/auth/hooks/useAuth";
import type { AuthorityLevel, PresenceStatus, UserProfile } from "@/features/auth/types";

import { useI18n } from "@/lib/i18n/useI18n";
const STATUS_OPTIONS: PresenceStatus[] = ["ONLINE", "LIMITED", "DO_NOT_DISTURB"];

const STATUS_DOT_CLASSES: Record<PresenceStatus, string> = {
  ONLINE: "bg-success",
  LIMITED: "bg-warning",
  DO_NOT_DISTURB: "bg-danger",
};

interface ProfileAvatarFormProps {
  currentUser: UserProfile;
}

/**
 * Avatar upload + presence status - both self-service, both purely about how this user presents
 * to others (see Avatar.tsx / backend PresenceStatus javadoc: status is a display signal only,
 * it never filters real notifications).
 */
export function ProfileAvatarForm({ currentUser }: ProfileAvatarFormProps) {
  const { t } = useI18n();
  const uploadAvatar = useUploadAvatar();
  const updatePresence = useUpdatePresence();
  const logout = useLogout();
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    try {
      await uploadAvatar.mutateAsync(file);
      showToast("success", t("common.profilePhotoUpdated"));
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTUploadTheProfilePhoto"));
    }
  }

  function handleStatusChange(status: PresenceStatus) {
    updatePresence.mutate(status, {
      onError: (err) =>
        showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTChangeYourStatus")),
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t("settings.profileAvatarForm.profile")}</h2>
          <p className="text-sm text-fg-muted">
            {currentUser.fullName} - {currentUser.title ?? t(LEVEL_SHORT_LABEL_KEYS[currentUser.authorityLevel])}
            {currentUser.departmentName ? ` · ${currentUser.departmentName}` : ""}
            {currentUser.teamName ? ` · ${currentUser.teamName}` : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout} loading={logout.isPending}>
          {t("common.signOut")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Avatar avatarUrl={currentUser.avatarUrl} fullName={currentUser.fullName} size="lg" />
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="rounded border border-line-strong px-3 py-1.5 text-sm font-medium text-fg-soft transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {uploadAvatar.isPending ? t("settings.profileAvatarForm.uploading") : t("common.changeProfilePhoto")}
          </button>
          <p className="mt-1 text-xs text-fg-muted">{t("settings.profileAvatarForm.pngJpegOrWebp2mbAt")}</p>
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
        <p className="mb-2 text-sm font-medium text-fg-soft">{t("common.status")}</p>
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
                  ${isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-line-strong hover:border-line-strong"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASSES[status]}`} aria-hidden />
                {t(PRESENCE_STATUS_KEYS[status])}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
