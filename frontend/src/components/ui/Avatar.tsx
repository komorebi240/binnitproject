"use client";

import { useAuthedBlobUrl } from "@/lib/hooks/useAuthedBlobUrl";
import type { PresenceStatus } from "@/features/auth/types";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

const DOT_SIZE_CLASSES = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
} as const;

const STATUS_CLASSES: Record<PresenceStatus, string> = {
  ONLINE: "bg-success",
  LIMITED: "bg-warning",
  DO_NOT_DISTURB: "bg-danger",
};

export const STATUS_LABELS: Record<PresenceStatus, string> = {
  ONLINE: "Trực tuyến",
  LIMITED: "Hạn chế",
  DO_NOT_DISTURB: "Không làm phiền",
};

interface AvatarProps {
  avatarUrl: string | null;
  fullName: string;
  presenceStatus?: PresenceStatus;
  size?: keyof typeof SIZE_CLASSES;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Design-system primitive (CLAUDE.md section 26). Falls back to initials-on-brand-gradient when
 * no avatar is set, and optionally overlays a colored presence dot (see PresenceStatus - purely
 * a display signal, never a notification filter). Used anywhere a person is shown: header,
 * directory, Nhân sự table.
 */
export function Avatar({ avatarUrl, fullName, presenceStatus, size = "md" }: AvatarProps) {
  const objectUrl = useAuthedBlobUrl(avatarUrl);

  return (
    <span className={`relative inline-flex shrink-0 ${SIZE_CLASSES[size]}`}>
      {objectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it anyway
        <img
          src={objectUrl}
          alt=""
          className={`h-full w-full rounded-full object-cover ${SIZE_CLASSES[size]}`}
        />
      ) : (
        <span
          className={`gradient-surface flex h-full w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-primaryEnd font-semibold text-primary-foreground ${SIZE_CLASSES[size]}`}
          aria-hidden
        >
          {initials(fullName)}
        </span>
      )}
      {presenceStatus && (
        <span
          title={STATUS_LABELS[presenceStatus]}
          className={`absolute bottom-0 right-0 rounded-full border-2 border-surface ${DOT_SIZE_CLASSES[size]} ${STATUS_CLASSES[presenceStatus]}`}
        />
      )}
    </span>
  );
}
