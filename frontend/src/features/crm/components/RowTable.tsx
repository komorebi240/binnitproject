"use client";

import { useState } from "react";
import { Check, Trash, X } from "@phosphor-icons/react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/useI18n";
import { crmErrorMessage } from "../crmErrors";
import { useAddRow, useUpdateRow } from "../hooks/useCrm";
import type { Column, CrmColumnType, Row } from "../types";

/** How each kind of column is typed into: the right on-screen keyboard and the browser's own date picker. */
const INPUT_ATTRIBUTES: Record<CrmColumnType, { type: string; inputMode?: "decimal" | "email" | "tel" }> = {
  TEXT: { type: "text" },
  NUMBER: { type: "text", inputMode: "decimal" },
  DATE: { type: "date" },
  EMAIL: { type: "email", inputMode: "email" },
  PHONE: { type: "tel", inputMode: "tel" },
};

const CELL_INPUT_CLASS =
  "w-full min-w-32 rounded border border-primary bg-surface px-2 py-1 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

/** The table of customers: a click on a cell edits it in place, a new customer is typed into a row at the top. */
export function RowTable({
  datasetId,
  columns,
  rows,
  canManage,
  adding,
  onAddingDone,
  onRenameColumn,
  onDeleteColumn,
  onDeleteRow,
}: {
  datasetId: number;
  columns: Column[];
  rows: Row[];
  canManage: boolean;
  adding: boolean;
  onAddingDone: () => void;
  onRenameColumn: (column: Column) => void;
  onDeleteColumn: (column: Column) => void;
  onDeleteRow: (row: Row) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="glass-card animate-fade-in overflow-x-auto rounded">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium text-fg-soft">
                <span className="inline-flex items-center gap-1">
                  {column.name}
                  {canManage && (
                    <ActionMenu
                      size="sm"
                      label={t("crm.column.options", { name: column.name })}
                      items={[
                        { label: t("crm.column.rename"), onSelect: () => onRenameColumn(column) },
                        { label: t("crm.column.delete"), onSelect: () => onDeleteColumn(column), danger: true },
                      ]}
                    />
                  )}
                </span>
              </th>
            ))}
            <th scope="col" className="w-12 px-2 py-2">
              <span className="sr-only">{t("crm.row.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {adding && <DraftRow datasetId={datasetId} columns={columns} onDone={onAddingDone} />}
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-muted/40">
              {columns.map((column) => (
                <td key={column.id} className="px-1 py-1 align-top">
                  <EditableCell datasetId={datasetId} row={row} column={column} />
                </td>
              ))}
              <td className="px-2 py-1 text-right align-top">
                {row.canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row)}
                    aria-label={t("crm.row.delete")}
                    title={t("crm.row.delete")}
                    className="rounded p-1.5 text-fg-faint transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Trash size={16} aria-hidden />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableCell({ datasetId, row, column }: { datasetId: number; row: Row; column: Column }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const updateRow = useUpdateRow(datasetId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const value = row.values[String(column.id)] ?? "";
  const attributes = INPUT_ATTRIBUTES[column.dataType];

  async function commit() {
    setEditing(false);
    if (draft.trim() === value) return;
    try {
      await updateRow.mutateAsync({ rowId: row.id, values: { [column.id]: draft } });
    } catch (err) {
      showToast("error", crmErrorMessage(err, t("crm.row.couldNotSave"), t));
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={t("crm.row.editCell", { column: column.name })}
        className="block min-h-8 w-full min-w-32 rounded px-2 py-1 text-left text-fg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {value || <span className="text-fg-faint">-</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type={attributes.type}
      inputMode={attributes.inputMode}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      aria-label={column.name}
      maxLength={2000}
      className={CELL_INPUT_CLASS}
    />
  );
}

function DraftRow({ datasetId, columns, onDone }: { datasetId: number; columns: Column[]; onDone: () => void }) {
  const { t } = useI18n();
  const addRow = useAddRow(datasetId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    setErrorMessage(null);
    try {
      await addRow.mutateAsync(values);
      onDone();
    } catch (err) {
      setErrorMessage(crmErrorMessage(err, t("crm.row.couldNotAdd"), t));
    }
  }

  return (
    <>
      <tr className="bg-primary/5">
        {columns.map((column, index) => (
          <td key={column.id} className="px-1 py-1 align-top">
            <input
              autoFocus={index === 0}
              type={INPUT_ATTRIBUTES[column.dataType].type}
              inputMode={INPUT_ATTRIBUTES[column.dataType].inputMode}
              value={values[String(column.id)] ?? ""}
              onChange={(event) => setValues({ ...values, [column.id]: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
                if (event.key === "Escape") onDone();
              }}
              aria-label={column.name}
              placeholder={column.name}
              maxLength={2000}
              className={CELL_INPUT_CLASS}
            />
          </td>
        ))}
        <td className="whitespace-nowrap px-2 py-1 text-right align-top">
          <Button type="button" onClick={save} loading={addRow.isPending} className="!px-2 !py-1" aria-label={t("crm.row.saveNew")}>
            <Check size={16} aria-hidden />
          </Button>
          <button
            type="button"
            onClick={onDone}
            aria-label={t("common.cancel")}
            className="ml-1 rounded p-1.5 text-fg-faint hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </td>
      </tr>
      {errorMessage && (
        <tr>
          <td colSpan={columns.length + 1} className="px-3 pb-2">
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
