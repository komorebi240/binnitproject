"use client";

import { Scan } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/useI18n";
import { useSmartSelect } from "./SmartSelectProvider";

/** The header's way into Smart select, for people who do not know the Alt+S shortcut. */
export function SmartSelectButton({ className }: { className: string }) {
  const { t } = useI18n();
  const { start } = useSmartSelect();
  return (
    <button
      type="button"
      title={t("smartSelect.button.title")}
      aria-label={t("smartSelect.button.title")}
      aria-keyshortcuts="Alt+S"
      data-tour="smart-select"
      onClick={start}
      className={className}
    >
      <Scan size={20} aria-hidden />
    </button>
  );
}
