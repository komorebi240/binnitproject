"use client";

import { useState } from "react";
import { FileDoc, FileXls } from "@phosphor-icons/react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useI18n } from "@/lib/i18n/useI18n";
import { crmErrorMessage } from "../crmErrors";
import { useDownloadTemplate, useImport, usePreviewImport } from "../hooks/useCrm";
import { hasBadNewColumn, hasRepeatedTarget, suggestMapping, toColumnMappings, type MappingTarget } from "../importMapping";
import {
  COLUMN_TYPES,
  COLUMN_TYPE_KEYS,
  IMPORT_ACCEPT,
  MAX_IMPORT_BYTES,
  type Column,
  type CrmColumnType,
  type DuplicatePolicy,
  type ImportPreview,
  type ImportResult,
} from "../types";

const PROBLEM_KEYS: Record<string, TranslationKey> = {
  TOO_LONG: "crm.import.problem.tooLong",
  INVALID_NUMBER: "crm.import.problem.invalidNumber",
  INVALID_DATE: "crm.import.problem.invalidDate",
  INVALID_EMAIL: "crm.import.problem.invalidEmail",
  INVALID_PHONE: "crm.import.problem.invalidPhone",
};

const SKIP = "skip";
const NEW = "new";

/** "skip", "new" or "col:<id>": the value of the select that chooses where a column of the file goes. */
function selectValue(target: MappingTarget): string {
  if (target.kind === "existing") return `col:${target.columnId}`;
  return target.kind === "new" ? NEW : SKIP;
}

/**
 * Importing a file into a dataset, in steps: choose the file (Excel, CSV or the tables of a Word file), look at what it
 * holds and match its columns to the dataset's, then the result. Nothing is saved before the person confirms the mapping,
 * and the confirmation includes saying that the company may lawfully hold these people's data.
 */
export function ImportDialog({ datasetId, columns, onClose }: { datasetId: number; columns: Column[]; onClose: () => void }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const previewImport = usePreviewImport();
  const runImport = useImport(datasetId);
  const downloadTemplate = useDownloadTemplate();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [tableIndex, setTableIndex] = useState(0);
  const [targets, setTargets] = useState<MappingTarget[]>([]);
  const [policy, setPolicy] = useState<DuplicatePolicy>("SKIP");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const table = preview?.tables[tableIndex];

  async function handleFile(chosen: File | undefined) {
    setErrorMessage(null);
    if (!chosen) return;
    if (chosen.size > MAX_IMPORT_BYTES) {
      setErrorMessage(t("crm.error.fileTooLarge"));
      return;
    }
    try {
      const found = await previewImport.mutateAsync(chosen);
      setFile(chosen);
      setPreview(found);
      chooseTable(found, 0);
    } catch (err) {
      setErrorMessage(crmErrorMessage(err, t("crm.import.couldNotRead"), t));
    }
  }

  function chooseTable(source: ImportPreview, index: number) {
    setTableIndex(index);
    setTargets(suggestMapping(source.tables[index]?.headers ?? [], columns));
  }

  async function handleImport() {
    if (!file || !table) return;
    setErrorMessage(null);
    try {
      setResult(await runImport.mutateAsync({ file, options: { tableIndex, mappings: toColumnMappings(targets), duplicatePolicy: policy } }));
    } catch (err) {
      setErrorMessage(crmErrorMessage(err, t("crm.import.couldNotImport"), t));
    }
  }

  async function handleTemplate(kind: "xlsx" | "docx") {
    try {
      await downloadTemplate.mutateAsync(kind);
    } catch (err) {
      showToast("error", crmErrorMessage(err, t("crm.template.couldNotDownload"), t));
    }
  }

  function setTarget(index: number, target: MappingTarget) {
    setTargets(targets.map((current, i) => (i === index ? target : current)));
  }

  function handleSelect(index: number, value: string, header: string) {
    if (value === SKIP) return setTarget(index, { kind: "skip" });
    if (value === NEW) return setTarget(index, { kind: "new", name: header.trim(), type: "TEXT" });
    setTarget(index, { kind: "existing", columnId: Number(value.slice(4)) });
  }

  const nothingMapped = targets.every((target) => target.kind === "skip");
  const invalidMapping = hasRepeatedTarget(targets) || hasBadNewColumn(targets);

  return (
    <Modal title={t("crm.import.title")} onClose={onClose} widthClassName="max-w-3xl">
      {result ? (
        <ResultStep result={result} onClose={onClose} />
      ) : !preview || !table ? (
        <div className="flex flex-col gap-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg-soft">
            <li>{t("crm.import.guide.formats")}</li>
            <li>{t("crm.import.guide.firstRow")}</li>
            <li>{t("crm.import.guide.word")}</li>
            <li>{t("crm.import.guide.limits")}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => handleTemplate("xlsx")} loading={downloadTemplate.isPending}>
              <FileXls size={16} aria-hidden className="mr-1.5" />
              {t("crm.template.excel")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleTemplate("docx")} loading={downloadTemplate.isPending}>
              <FileDoc size={16} aria-hidden className="mr-1.5" />
              {t("crm.template.word")}
            </Button>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-fg-soft">
            {t("crm.import.chooseFile")}
            <input
              type="file"
              accept={IMPORT_ACCEPT}
              onChange={(event) => void handleFile(event.target.files?.[0])}
              disabled={previewImport.isPending}
              className="block w-full text-sm text-fg file:mr-3 file:rounded file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg"
            />
          </label>
          {previewImport.isPending && <p className="text-sm text-fg-muted">{t("crm.import.reading")}</p>}
          {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {preview.tables.length > 1 && (
            <Select
              label={t("crm.import.table")}
              value={String(tableIndex)}
              onChange={(event) => chooseTable(preview, Number(event.target.value))}
              options={preview.tables.map((candidate) => ({
                value: String(candidate.index),
                label: t("crm.import.tableOption", { name: candidate.name, count: candidate.totalRows }),
              }))}
            />
          )}
          <p className="text-sm text-fg-muted">{t("crm.import.mapIntro", { count: table.totalRows })}</p>

          <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto pr-1">
            {table.headers.map((header, index) => {
              const target = targets[index] ?? { kind: "skip" as const };
              const samples = table.sampleRows.map((row) => row[index] ?? "").filter(Boolean).slice(0, 2).join(" · ");
              return (
                <div key={index} className="grid grid-cols-1 gap-2 rounded border border-line p-3 sm:grid-cols-[1fr_1.2fr]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{header || t("crm.import.unnamedColumn", { number: index + 1 })}</p>
                    {samples && <p className="truncate text-xs text-fg-muted">{samples}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      label={t("crm.import.goesTo")}
                      value={selectValue(target)}
                      onChange={(event) => handleSelect(index, event.target.value, header)}
                      options={[
                        { value: SKIP, label: t("crm.import.skipColumn") },
                        ...columns.map((column) => ({ value: `col:${column.id}`, label: column.name })),
                        { value: NEW, label: t("crm.import.newColumn") },
                      ]}
                    />
                    {target.kind === "new" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          label={t("crm.column.name")}
                          value={target.name}
                          onChange={(event) => setTarget(index, { ...target, name: event.target.value })}
                          maxLength={100}
                        />
                        <Select
                          label={t("crm.column.type")}
                          value={target.type}
                          onChange={(event) => setTarget(index, { ...target, type: event.target.value as CrmColumnType })}
                          options={COLUMN_TYPES.map((type) => ({ value: type, label: t(COLUMN_TYPE_KEYS[type]) }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-fg-soft">{t("crm.import.duplicates")}</legend>
            {(["SKIP", "UPDATE"] as DuplicatePolicy[]).map((option) => (
              <label key={option} className="flex items-start gap-2 text-sm text-fg-soft">
                <input
                  type="radio"
                  name="duplicate-policy"
                  checked={policy === option}
                  onChange={() => setPolicy(option)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>{option === "SKIP" ? t("crm.import.duplicatesSkip") : t("crm.import.duplicatesUpdate")}</span>
              </label>
            ))}
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-fg-soft">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary"
            />
            <span>{t("crm.import.confirm")}</span>
          </label>

          {invalidMapping && <Alert tone="warning">{t("crm.import.invalidMapping")}</Alert>}
          {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleImport} loading={runImport.isPending} disabled={!confirmed || nothingMapped || invalidMapping}>
              {t("crm.import.start", { count: table.totalRows })}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setFile(null);
                setErrorMessage(null);
              }}
            >
              {t("crm.import.chooseAnother")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ResultStep({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <Alert tone={result.rejected > 0 ? "warning" : "success"} title={t("crm.import.done")}>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>{t("crm.import.result.created", { count: result.created })}</li>
          <li>{t("crm.import.result.updated", { count: result.updated })}</li>
          <li>{t("crm.import.result.skipped", { count: result.skippedDuplicates })}</li>
          <li>{t("crm.import.result.rejected", { count: result.rejected })}</li>
        </ul>
      </Alert>
      {result.issues.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-fg-soft">{t("crm.import.issues")}</p>
          <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-fg-muted">
            {result.issues.map((issue, index) => {
              const key = PROBLEM_KEYS[issue.problem];
              return (
                <li key={index}>
                  {t("crm.import.issue", { row: issue.row, column: issue.column, problem: key ? t(key) : issue.problem })}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div>
        <Button type="button" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
    </div>
  );
}
