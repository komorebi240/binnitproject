import type { ReactNode } from "react";

type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertProps {
  tone?: AlertTone;
  /** A short bold line above the message. */
  title?: string;
  children?: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  info: "border-info/30 bg-info/10 text-info-text",
  success: "border-success/30 bg-success/10 text-success-text",
  warning: "border-warning/30 bg-warning/10 text-warning-text",
  danger: "border-danger/30 bg-danger/10 text-danger-text",
};

/**
 * Design-system primitive (CLAUDE.md section 26): a callout for a message the person should notice. Colours come
 * from the status tokens, so it reads in every theme (dark included). Danger is announced at once (`role="alert"`),
 * the others politely (`role="status"`); the tone is never shown by colour alone because the message says what it is.
 */
export function Alert({ tone = "info", title, children, className = "" }: AlertProps) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`animate-fade-in flex flex-col gap-1.5 rounded border px-3 py-2.5 text-sm ${TONE_CLASSES[tone]} ${className}`}>
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}
