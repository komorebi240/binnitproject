"use client";

import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/lib/i18n/useI18n";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useAudit } from "../hooks/useCrm";

const ACTION_KEYS: Record<string, TranslationKey> = {
  DATASET_CREATED: "crm.audit.action.datasetCreated",
  DATASET_UPDATED: "crm.audit.action.datasetUpdated",
  DATASET_DELETED: "crm.audit.action.datasetDeleted",
  COLUMN_ADDED: "crm.audit.action.columnAdded",
  COLUMN_RENAMED: "crm.audit.action.columnRenamed",
  COLUMN_DELETED: "crm.audit.action.columnDeleted",
  ROW_DELETED: "crm.audit.action.rowDeleted",
  IMPORT: "crm.audit.action.import",
  EXPORT: "crm.audit.action.export",
};

/** Who imported, exported or deleted what, and when: counts only, never a customer's details. Executives only. */
export function AuditLogDialog({ onClose }: { onClose: () => void }) {
  const { t, intlLocale } = useI18n();
  const { data: entries, isLoading, isError } = useAudit();

  return (
    <Modal title={t("crm.audit.title")} onClose={onClose} widthClassName="max-w-3xl">
      <p className="text-sm text-fg-muted">{t("crm.audit.intro")}</p>
      {isLoading && <Skeleton rows={4} />}
      {isError && (
        <p role="alert" className="text-sm text-danger">
          {t("crm.audit.couldNotLoad")}
        </p>
      )}
      {entries && entries.length === 0 && <p className="text-sm text-fg-faint">{t("crm.audit.empty")}</p>}
      {entries && entries.length > 0 && (
        <div className="max-h-[55vh] overflow-auto rounded border border-line">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface-muted/60 text-left text-fg-soft">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{t("crm.audit.when")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("crm.audit.who")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("crm.audit.what")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("crm.audit.details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry) => {
                const actionKey = ACTION_KEYS[entry.action];
                return (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-fg-muted">{new Date(entry.createdAt).toLocaleString(intlLocale)}</td>
                  <td className="px-3 py-2">{entry.userName}</td>
                  <td className="px-3 py-2">{actionKey ? t(actionKey) : entry.action}</td>
                  <td className="px-3 py-2 text-fg-muted">{entry.detail ?? ""}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
