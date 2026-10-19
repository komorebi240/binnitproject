"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadSimple, FileDoc, FilePdf, FileText, FileXls, File as FileIcon } from "@phosphor-icons/react";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { previewKind, type FileSource, type PreviewKind } from "../fileSources";
import { useAttachmentFile } from "../hooks/useAttachmentFile";
import { decodeText, parseCsv } from "../textDecoding";
import { DocxPreview } from "./DocxPreview";
import { MAX_ROWS } from "../sheetLayout";
import { SheetPreview, type SheetData } from "./SheetPreview";

const KIND_ICONS = { pdf: FilePdf, docx: FileDoc, xlsx: FileXls, csv: FileXls, text: FileText } as const;

/** A blob address for the bytes, released when the view goes away. */
function useObjectUrl(bytes: ArrayBuffer | undefined, type: string): string | null {
  const url = useMemo(() => (bytes ? URL.createObjectURL(new Blob([bytes], { type })) : null), [bytes, type]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function SpreadsheetPreview({ bytes, onError }: { bytes: ArrayBuffer; onError: () => void }) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Loaded only when a workbook is opened.
    import("read-excel-file/universal")
      .then(({ default: readXlsxFile }) => readXlsxFile(bytes))
      .then((result) => {
        if (!cancelled) setSheets(result.map((sheet) => ({ name: sheet.sheet, rows: sheet.data as unknown as SheetData["rows"] })));
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
    };
  }, [bytes, onError]);
  return sheets ? <SheetPreview sheets={sheets} /> : <Skeleton rows={6} />;
}

/**
 * One attachment opened in its own tab, read-only: PDF in the browser's own viewer, Word documents and Excel workbooks
 * drawn in the page, CSV and text files as they are. Anything else (legacy .doc/.xls/.ppt, slides, archives) or a file
 * that fails to open offers the download instead. The bytes come through the attachment's usual endpoint, so whoever
 * may not download it cannot view it either.
 */
export function FileViewerView({ source, fileName }: { source: FileSource; fileName: string }) {
  const { t } = useI18n();
  const { data, isLoading, error } = useAttachmentFile(source);
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  const kind: PreviewKind | null = data ? previewKind(fileName, data.contentType) : previewKind(fileName);
  const contentType = data?.contentType ?? "application/octet-stream";
  const objectUrl = useObjectUrl(data?.bytes, kind === "pdf" ? "application/pdf" : contentType);
  const text = useMemo(() => (data && (kind === "text" || kind === "csv") ? decodeText(data.bytes) : null), [data, kind]);
  const csvSheets = useMemo<SheetData[] | null>(
    () => (text !== null && kind === "csv" ? [{ name: "CSV", rows: parseCsv(text, MAX_ROWS + 1) }] : null),
    [text, kind],
  );
  const Icon = kind ? KIND_ICONS[kind] : FileIcon;

  const download = objectUrl ? (
    <a
      href={objectUrl}
      download={fileName}
      className={buttonClassName("secondary", "gap-1.5")}
    >
      <DownloadSimple size={16} aria-hidden />
      {t("fileViewer.download")}
    </a>
  ) : null;

  function body() {
    if (isLoading) return <Skeleton rows={6} />;
    if (error || !data) {
      const notFound = error instanceof ApiRequestError && (error.status === 404 || error.status === 403);
      return <EmptyState title={notFound ? t("fileViewer.notFound") : t("fileViewer.couldNotLoad")} />;
    }
    if (failed || !kind) {
      return (
        <EmptyState
          title={failed ? t("fileViewer.couldNotOpen") : t("fileViewer.noPreview")}
          description={t("fileViewer.downloadInstead")}
          action={download}
        />
      );
    }
    switch (kind) {
      case "pdf":
        return objectUrl ? <iframe src={objectUrl} title={fileName} className="h-full w-full rounded border border-line" /> : null;
      case "docx":
        return <DocxPreview bytes={data.bytes} title={fileName} onError={handleError} />;
      case "xlsx":
        return <SpreadsheetPreview bytes={data.bytes} onError={handleError} />;
      case "csv":
        return csvSheets ? <SheetPreview sheets={csvSheets} /> : null;
      case "text":
        return (
          <pre className="h-full overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-surface p-4 text-sm text-fg">
            {text}
          </pre>
        );
    }
  }

  return (
    <section className="flex h-full min-h-[480px] flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={22} aria-hidden className="shrink-0 text-primary-text" />
          <h1 className="truncate text-lg font-semibold text-fg" title={fileName}>
            {fileName}
          </h1>
        </div>
        {data && download}
      </header>
      <div className="min-h-0 flex-1">{body()}</div>
    </section>
  );
}

