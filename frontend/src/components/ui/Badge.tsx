import type { ReactNode } from "react";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-fg-soft",
  info: "bg-info/15 text-info-text",
  success: "bg-success/15 text-success-text",
  warning: "bg-warning/15 text-warning-text",
  danger: "bg-danger/15 text-danger-text",
};

/** Design-system primitive (CLAUDE.md section 26) - status/priority pills use color plus text,
 * never color alone, so the meaning still reads without relying on color perception (CLAUDE.md
 * section 27). */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
