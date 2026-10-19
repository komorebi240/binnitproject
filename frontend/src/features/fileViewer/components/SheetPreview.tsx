"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowsOutLineHorizontal, TextAlignLeft } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  MAX_COLUMNS,
  MAX_ROWS,
  autoFitWidth,
  cellText,
  clampWidth,
  columnName,
  type Cell,
} from "../sheetLayout";

export interface SheetData {
  name: string;
  rows: Cell[][];
}

const ROW_HEADER_WIDTH = 48;
const KEY_RESIZE_STEP = 16;
const TABLE_FONT = "14px ui-sans-serif, system-ui, sans-serif";

/** Text width in the table's font, measured on a canvas (no layout needed). */
function useTextMeasure(): (text: string) => number {
  return useMemo(() => {
    const context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    if (context) context.font = TABLE_FONT;
    return (text: string) => (context ? context.measureText(text).width : text.length * 7.5);
  }, []);
}

/** One sheet as a read-only grid: resizable columns, optional wrapping, and a bar showing the selected cell in full. */
function SheetGrid({ sheet }: { sheet: SheetData }) {
  const { t, intlLocale } = useI18n();
  const measure = useTextMeasure();
  const rows = useMemo(() => sheet.rows.slice(0, MAX_ROWS), [sheet.rows]);
  const columns = Math.min(rows.reduce((max, row) => Math.max(max, row.length), 0), MAX_COLUMNS);
  const texts = useMemo(
    () => rows.map((row) => Array.from({ length: columns }, (_, column) => cellText(row[column], intlLocale))),
    [rows, columns, intlLocale],
  );
  const fitted = useMemo(
    () => Array.from({ length: columns }, (_, column) => autoFitWidth(texts.map((row) => row[column] ?? ""), measure)),
    [texts, columns, measure],
  );
  const [widths, setWidths] = useState<number[] | null>(null);
  const shownWidths = widths ?? fitted;
  const [wrap, setWrap] = useState(false);
  const [selected, setSelected] = useState<{ row: number; column: number } | null>(null);
  const drag = useRef<{ column: number; startX: number; startWidth: number } | null>(null);
  const truncated = sheet.rows.length > MAX_ROWS || sheet.rows.some((row) => row.length > MAX_COLUMNS);

  function setWidth(column: number, width: number) {
    setWidths((current) => {
      const next = [...(current ?? fitted)];
      next[column] = clampWidth(width);
      return next;
    });
  }

  if (rows.length === 0 || columns === 0) {
    return <p className="text-sm text-fg-muted">{t("fileViewer.sheet.empty")}</p>;
  }

  const selectedText = selected ? (texts[selected.row]?.[selected.column] ?? "") : null;
  const tableWidth = ROW_HEADER_WIDTH + shownWidths.reduce((sum, width) => sum + width, 0);
  const cellMode = wrap ? "whitespace-pre-wrap break-words" : "overflow-hidden text-ellipsis whitespace-nowrap";
  const toolButton =
    "flex items-center gap-1.5 rounded px-2 py-1 text-xs text-fg-soft transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex min-w-[12rem] flex-1 items-start gap-2 rounded border border-line bg-surface px-2 py-1 text-sm [.pane-narrow_&]:basis-full" aria-live="polite">
          <span className="shrink-0 rounded bg-surface-muted px-1.5 text-xs font-medium leading-5 text-fg-muted">
            {selected ? `${columnName(selected.column)}${selected.row + 1}` : "-"}
          </span>
          <span className={`max-h-24 min-w-0 flex-1 select-text overflow-auto whitespace-pre-wrap break-words ${selectedText ? "text-fg" : "text-fg-faint"}`}>
            {selected ? selectedText || t("fileViewer.sheet.emptyCell") : t("fileViewer.sheet.selectHint")}
          </span>
        </div>
        <button type="button" onClick={() => setWrap((value) => !value)} aria-pressed={wrap} className={`${toolButton} ${wrap ? "bg-surface-muted text-fg" : ""}`}>
          <TextAlignLeft size={16} aria-hidden />
          {t("fileViewer.sheet.wrap")}
        </button>
        <button type="button" onClick={() => setWidths(null)} className={toolButton} title={t("fileViewer.sheet.fitColumnsHint")}>
          <ArrowsOutLineHorizontal size={16} aria-hidden />
          {t("fileViewer.sheet.fitColumns")}
        </button>
      </div>
      {truncated && (
        <p className="shrink-0 text-xs text-fg-muted">{t("fileViewer.sheet.truncated", { rows: MAX_ROWS, columns: MAX_COLUMNS })}</p>
      )}
      <div className="min-h-0 flex-1 overflow-auto rounded border border-line bg-surface">
        <table className="table-fixed border-collapse text-sm text-fg" style={{ width: tableWidth, font: TABLE_FONT }}>
          <colgroup>
            <col style={{ width: ROW_HEADER_WIDTH }} />
            {shownWidths.map((width, column) => (
              <col key={column} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-line bg-surface-muted px-2 py-1" aria-hidden />
              {shownWidths.map((width, column) => (
                <th
                  key={column}
                  scope="col"
                  className="sticky top-0 z-10 select-none border-b border-r border-line bg-surface-muted px-2 py-1 text-center text-xs font-medium text-fg-muted"
                >
                  {columnName(column)}
                  {/* Drag the edge (or use the arrow keys) to widen the column; double-click fits it to its content. */}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={t("fileViewer.sheet.columnWidth", { column: columnName(column) })}
                    aria-valuenow={width}
                    tabIndex={0}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      drag.current = { column, startX: event.clientX, startWidth: width };
                    }}
                    onPointerMove={(event) => {
                      const current = drag.current;
                      if (current && current.column === column) setWidth(column, current.startWidth + event.clientX - current.startX);
                    }}
                    onPointerUp={() => {
                      drag.current = null;
                    }}
                    onDoubleClick={() => setWidth(column, fitted[column] ?? width)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowRight") setWidth(column, width + KEY_RESIZE_STEP);
                      else if (event.key === "ArrowLeft") setWidth(column, width - KEY_RESIZE_STEP);
                      else return;
                      event.preventDefault();
                    }}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none hover:bg-primary/40 focus-visible:bg-primary focus-visible:outline-none"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {texts.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-line bg-surface-muted px-2 py-1 text-right align-top text-xs font-medium text-fg-muted"
                >
                  {rowIndex + 1}
                </th>
                {row.map((text, column) => {
                  const isSelected = selected?.row === rowIndex && selected.column === column;
                  return (
                    <td
                      key={column}
                      onClick={() => setSelected({ row: rowIndex, column })}
                      className={`border-b border-r border-line px-2 py-1 align-top ${cellMode} ${
                        isSelected ? "outline outline-2 -outline-offset-2 outline-primary" : ""
                      }`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Sheets of a workbook (or a CSV file) as read-only grids with spreadsheet-style column letters and row numbers, one
 * sheet at a time. Values are shown as text - React escapes them - with dates in the reader's own format.
 */
export function SheetPreview({ sheets }: { sheets: SheetData[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const index = Math.min(active, sheets.length - 1);
  const sheet = sheets[index];
  if (!sheet) return <p className="text-sm text-fg-muted">{t("fileViewer.sheet.empty")}</p>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {sheets.length > 1 && (
        <div role="tablist" aria-label={t("fileViewer.sheet.sheets")} className="flex shrink-0 gap-1 overflow-x-auto">
          {sheets.map((item, itemIndex) => (
            <button
              key={`${item.name}-${itemIndex}`}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
              onClick={() => setActive(itemIndex)}
              className={`shrink-0 rounded px-3 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                itemIndex === index ? "bg-primary text-primary-foreground" : "text-fg-soft hover:bg-surface-muted"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
      {/* Keyed by sheet: each sheet starts with its own column widths and selection. */}
      <SheetGrid key={index} sheet={sheet} />
    </div>
  );
}
