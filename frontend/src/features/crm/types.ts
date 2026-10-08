import type { TranslationKey } from "@/lib/i18n/dictionary";

export type CrmSourceType = "FACEBOOK" | "ZALO" | "WEBSITE" | "EXCEL" | "EVENT" | "REFERRAL" | "OTHER";
export type CrmColumnType = "TEXT" | "NUMBER" | "DATE" | "EMAIL" | "PHONE";
export type DuplicatePolicy = "SKIP" | "UPDATE";

export const SOURCE_TYPES: CrmSourceType[] = ["FACEBOOK", "ZALO", "WEBSITE", "EXCEL", "EVENT", "REFERRAL", "OTHER"];
export const COLUMN_TYPES: CrmColumnType[] = ["TEXT", "NUMBER", "DATE", "EMAIL", "PHONE"];

export const SOURCE_TYPE_KEYS: Record<CrmSourceType, TranslationKey> = {
  FACEBOOK: "crm.source.facebook",
  ZALO: "crm.source.zalo",
  WEBSITE: "crm.source.website",
  EXCEL: "crm.source.excel",
  EVENT: "crm.source.event",
  REFERRAL: "crm.source.referral",
  OTHER: "crm.source.other",
};

export const COLUMN_TYPE_KEYS: Record<CrmColumnType, TranslationKey> = {
  TEXT: "crm.columnType.text",
  NUMBER: "crm.columnType.number",
  DATE: "crm.columnType.date",
  EMAIL: "crm.columnType.email",
  PHONE: "crm.columnType.phone",
};

/** Mirrors the backend limits (the server checks them again). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_ACCEPT = ".xlsx,.csv,.docx";
export const ROWS_PAGE_SIZE = 50;

export interface Dataset {
  id: number;
  name: string;
  sourceType: CrmSourceType;
  description: string | null;
  departmentId: number | null;
  departmentName: string | null;
  rowCount: number;
  /** A hint for showing the buttons; the server decides. */
  canManage: boolean;
  createdAt: string;
}

export interface Column {
  id: number;
  name: string;
  dataType: CrmColumnType;
  position: number;
}

export interface DatasetDetail {
  dataset: Dataset;
  columns: Column[];
}

/** A customer: the value of each column that has one, by column id. */
export interface Row {
  id: number;
  values: Record<string, string>;
  /** A hint for showing the delete button; the server decides. */
  canDelete: boolean;
}

export interface RowPage {
  rows: Row[];
  page: number;
  size: number;
  total: number;
}

export interface SaveDatasetInput {
  name: string;
  sourceType: CrmSourceType;
  description?: string;
  departmentId: number | null;
}

export interface PreviewTable {
  index: number;
  name: string;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

export interface ImportPreview {
  tables: PreviewTable[];
}

export interface ColumnMapping {
  sourceIndex: number;
  columnId?: number;
  newName?: string;
  newType?: CrmColumnType;
}

export interface ImportOptions {
  tableIndex: number;
  mappings: ColumnMapping[];
  duplicatePolicy: DuplicatePolicy;
}

export interface ImportIssue {
  row: number;
  column: string;
  problem: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skippedDuplicates: number;
  rejected: number;
  issues: ImportIssue[];
}

export interface AuditEntry {
  id: number;
  userName: string;
  action: string;
  datasetId: number | null;
  detail: string | null;
  createdAt: string;
}
