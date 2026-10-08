"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CaretLeft, CaretRight, DownloadSimple, MagnifyingGlass, Plus, UploadSimple } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { crmErrorMessage } from "../crmErrors";
import {
  useAddColumn,
  useDataset,
  useDeleteColumn,
  useDeleteDataset,
  useDeleteRow,
  useExportDataset,
  useRenameColumn,
  useRows,
  useUpdateDataset,
} from "../hooks/useCrm";
import { ROWS_PAGE_SIZE, SOURCE_TYPE_KEYS, type Column, type Row } from "../types";
import { ColumnDialog } from "./ColumnDialog";
import { DatasetFormDialog } from "./DatasetFormDialog";
import { ImportDialog } from "./ImportDialog";
import { RowTable } from "./RowTable";

const SEARCH_DELAY_MS = 300;

/** One dataset as a table: search, add and edit customers in place, import from a file, export (executives), and manage columns. */
export function DatasetView({
  datasetId,
  currentUser,
  onBack,
  onDeleted,
}: {
  datasetId: number;
  currentUser: UserProfile;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { data: detail, isLoading, isError } = useDataset(datasetId);

  const [page, setPage] = useState(0);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const { data: rowPage } = useRows(datasetId, page, ROWS_PAGE_SIZE, query);

  const updateDataset = useUpdateDataset(datasetId);
  const deleteDataset = useDeleteDataset(datasetId);
  const addColumn = useAddColumn(datasetId);
  const renameColumn = useRenameColumn(datasetId);
  const deleteColumn = useDeleteColumn(datasetId);
  const deleteRow = useDeleteRow(datasetId);
  const exportDataset = useExportDataset(datasetId);

  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deletingDataset, setDeletingDataset] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [renamingColumn, setRenamingColumn] = useState<Column | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<Column | null>(null);
  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [columnError, setColumnError] = useState<string | null>(null);

  // Searching waits for a pause in typing, and always starts again from the first page.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(typed.trim());
      setPage(0);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [typed]);

  if (isLoading) {
    return <Skeleton rows={4} />;
  }
  if (isError || !detail) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-danger">
          {t("crm.dataset.couldNotLoad")}
        </p>
        <div>
          <Button variant="secondary" onClick={onBack}>
            {t("crm.dataset.backToList")}
          </Button>
        </div>
      </div>
    );
  }

  const { dataset, columns } = detail;
  const isExecutive = currentUser.authorityLevel === "EXECUTIVE";
  const total = rowPage?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ROWS_PAGE_SIZE));

  async function handleExport() {
    try {
      await exportDataset.mutateAsync();
      showToast("success", t("crm.export.done"));
    } catch (err) {
      showToast("error", crmErrorMessage(err, t("crm.export.couldNotExport"), t));
    }
  }

  async function handleDeleteDataset() {
    try {
      await deleteDataset.mutateAsync();
      showToast("success", t("crm.dataset.deleted"));
      onDeleted();
    } catch (err) {
      setDeletingDataset(false);
      showToast("error", crmErrorMessage(err, t("crm.dataset.couldNotDelete"), t));
    }
  }

  async function handleDeleteRow() {
    if (!deletingRow) return;
    try {
      await deleteRow.mutateAsync(deletingRow.id);
      setDeletingRow(null);
    } catch (err) {
      setDeletingRow(null);
      showToast("error", crmErrorMessage(err, t("crm.row.couldNotDelete"), t));
    }
  }

  async function handleDeleteColumn() {
    if (!deletingColumn) return;
    try {
      await deleteColumn.mutateAsync(deletingColumn.id);
      setDeletingColumn(null);
    } catch (err) {
      setDeletingColumn(null);
      showToast("error", crmErrorMessage(err, t("crm.column.couldNotDelete"), t));
    }
  }

  async function handleSaveColumn(name: string, dataType: Column["dataType"]) {
    setColumnError(null);
    try {
      if (renamingColumn) {
        await renameColumn.mutateAsync({ columnId: renamingColumn.id, name });
        setRenamingColumn(null);
      } else {
        await addColumn.mutateAsync({ name, dataType });
        setAddingColumn(false);
      }
    } catch (err) {
      setColumnError(crmErrorMessage(err, t("crm.column.couldNotSave"), t));
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-1 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft size={14} aria-hidden />
            {t("crm.dataset.backToList")}
          </button>
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-fg">
            {dataset.name}
            <Badge tone="info">{t(SOURCE_TYPE_KEYS[dataset.sourceType])}</Badge>
          </h1>
          <p className="text-sm text-fg-muted">
            {t("crm.dataset.rowCount", { count: dataset.rowCount })} · {dataset.departmentName ?? t("crm.dataset.executivesOnly")}
          </p>
          {dataset.description && <p className="mt-1 max-w-3xl text-sm text-fg-soft">{dataset.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {dataset.canManage && (
            <>
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <UploadSimple size={16} aria-hidden className="mr-1.5" />
                {t("crm.import.open")}
              </Button>
              <Button variant="secondary" onClick={() => { setColumnError(null); setAddingColumn(true); }}>
                {t("crm.column.add")}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t("crm.dataset.edit")}
              </Button>
              <Button variant="danger" onClick={() => setDeletingDataset(true)}>
                {t("crm.dataset.delete")}
              </Button>
            </>
          )}
          {isExecutive && (
            <Button variant="secondary" onClick={handleExport} loading={exportDataset.isPending}>
              <DownloadSimple size={16} aria-hidden className="mr-1.5" />
              {t("crm.export.open")}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">{t("crm.row.search")}</span>
          <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint" />
          <input
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t("crm.row.search")}
            className="w-full rounded border border-line-strong bg-surface py-1.5 pl-8 pr-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
        <Button onClick={() => setAdding(true)} disabled={adding || columns.length === 0}>
          <Plus size={16} aria-hidden className="mr-1.5" />
          {t("crm.row.add")}
        </Button>
      </div>

      {columns.length === 0 ? (
        <EmptyState title={t("crm.dataset.noColumns")} description={t("crm.dataset.noColumnsHint")} />
      ) : (rowPage?.rows.length ?? 0) === 0 && !adding ? (
        <EmptyState
          title={query ? t("crm.row.noMatch") : t("crm.row.emptyTitle")}
          description={query ? undefined : t("crm.row.emptyHint")}
        />
      ) : (
        <RowTable
          datasetId={datasetId}
          columns={columns}
          rows={rowPage?.rows ?? []}
          canManage={dataset.canManage}
          adding={adding}
          onAddingDone={() => setAdding(false)}
          onRenameColumn={(column) => { setColumnError(null); setRenamingColumn(column); }}
          onDeleteColumn={setDeletingColumn}
          onDeleteRow={setDeletingRow}
        />
      )}

      {total > ROWS_PAGE_SIZE && (
        <nav aria-label={t("crm.row.pages")} className="flex items-center justify-between gap-2 text-sm text-fg-muted">
          <span>{t("crm.row.pageOf", { page: page + 1, pages: pageCount, total })}</span>
          <span className="flex gap-1">
            <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label={t("crm.row.previousPage")}>
              <CaretLeft size={16} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page + 1 >= pageCount} aria-label={t("crm.row.nextPage")}>
              <CaretRight size={16} aria-hidden />
            </Button>
          </span>
        </nav>
      )}

      {importing && <ImportDialog datasetId={datasetId} columns={columns} onClose={() => setImporting(false)} />}
      {editing && (
        <DatasetFormDialog
          currentUser={currentUser}
          dataset={dataset}
          saving={updateDataset.isPending}
          onSave={(input) => updateDataset.mutateAsync(input)}
          onClose={() => setEditing(false)}
        />
      )}
      {(addingColumn || renamingColumn) && (
        <ColumnDialog
          column={renamingColumn ?? undefined}
          saving={addColumn.isPending || renameColumn.isPending}
          errorMessage={columnError}
          onSave={handleSaveColumn}
          onClose={() => {
            setAddingColumn(false);
            setRenamingColumn(null);
          }}
        />
      )}
      {deletingDataset && (
        <ConfirmDialog
          title={t("crm.dataset.delete")}
          message={t("crm.dataset.deleteWarning", { name: dataset.name, count: dataset.rowCount })}
          confirmLabel={t("common.delete")}
          danger
          loading={deleteDataset.isPending}
          onConfirm={handleDeleteDataset}
          onClose={() => setDeletingDataset(false)}
        />
      )}
      {deletingColumn && (
        <ConfirmDialog
          title={t("crm.column.delete")}
          message={t("crm.column.deleteWarning", { name: deletingColumn.name })}
          confirmLabel={t("common.delete")}
          danger
          loading={deleteColumn.isPending}
          onConfirm={handleDeleteColumn}
          onClose={() => setDeletingColumn(null)}
        />
      )}
      {deletingRow && (
        <ConfirmDialog
          title={t("crm.row.delete")}
          message={t("crm.row.deleteWarning")}
          confirmLabel={t("common.delete")}
          danger
          loading={deleteRow.isPending}
          onConfirm={handleDeleteRow}
          onClose={() => setDeletingRow(null)}
        />
      )}
    </section>
  );
}
