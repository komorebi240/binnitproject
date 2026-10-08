import { ApiRequestError } from "@/lib/api/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { I18n } from "@/lib/i18n/useI18n";

/** The backend's error codes for the CRM, in the words of the interface. INVALID_CELL is already worded by the server (it names the column). */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  DUPLICATE_ROW: "crm.error.duplicateRow",
  DATASET_FULL: "crm.error.datasetFull",
  TOO_MANY_COLUMNS: "crm.error.tooManyColumns",
  COLUMN_NAME_TAKEN: "crm.error.columnNameTaken",
  IMPORT_FILE_TOO_LARGE: "crm.error.fileTooLarge",
  IMPORT_UNSUPPORTED_FILE: "crm.error.unsupportedFile",
  IMPORT_UNREADABLE: "crm.error.unreadableFile",
  IMPORT_NO_TABLE: "crm.error.noTable",
  IMPORT_TOO_LARGE: "crm.error.tooManyRows",
  IMPORT_TOO_WIDE: "crm.error.tooManyFileColumns",
  INVALID_MAPPING: "crm.error.invalidMapping",
  EXPORT_TOO_LARGE: "crm.error.exportTooLarge",
  TOO_MANY_REQUESTS: "crm.error.tooManyRequests",
};

export function crmErrorMessage(err: unknown, fallback: string, t: I18n["t"]): string {
  if (err instanceof ApiRequestError) {
    const key = MESSAGE_KEYS[err.code];
    if (key) return t(key);
    if (err.code === "INVALID_CELL") return err.message;
    if (err.status === 403) return t("crm.error.noPermission");
  }
  return fallback;
}
