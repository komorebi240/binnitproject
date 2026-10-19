"use client";

import { ArrowCounterClockwise, Broom, X } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/useI18n";

/** "Clear all" in the header of the Completed or Cancelled section. */
export function ClearAllButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={t("tasks.clearFinished.hint")}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Broom size={14} aria-hidden />
      {t("tasks.clearFinished.clearAll")}
    </button>
  );
}

/** Shown after a "Clear all" for a short while: how many tasks left the list, and the way back. */
export function ClearedNotice({
  count,
  onUndo,
  onDismiss,
  undoing,
}: {
  count: number;
  onUndo: () => void;
  onDismiss: () => void;
  undoing: boolean;
}) {
  const { t } = useI18n();
  return (
    <div role="status" className="animate-fade-in flex flex-wrap items-center gap-2 rounded border border-line bg-surface-muted px-3 py-2 text-sm text-fg-soft">
      <span>{t("tasks.clearFinished.cleared", { count })}</span>
      <button
        type="button"
        onClick={onUndo}
        disabled={undoing}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
      >
        <ArrowCounterClockwise size={14} aria-hidden />
        {t("tasks.clearFinished.undo")}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("common.close")}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded text-fg-faint hover:bg-surface hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
