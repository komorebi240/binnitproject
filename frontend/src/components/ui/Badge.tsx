import type { ReactNode } from "react";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  info: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-700",
};

/** Design-system primitive (CLAUDE.md section 26) — status/priority pills use color plus text,
 * never color alone, so the meaning still reads without relying on color perception (CLAUDE.md
 * section 27). */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
