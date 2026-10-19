export type Cell = string | number | boolean | Date | null;

/** Bounds of what a tab shows of one sheet; the whole file is a download away. */
export const MAX_ROWS = 1_000;
export const MAX_COLUMNS = 50;

export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 800;
/** Widest a column becomes on its own (auto-fit, first view); dragging can go further. */
export const MAX_AUTO_WIDTH = 480;
export const DEFAULT_COLUMN_WIDTH = 120;
/** Cell padding left and right, plus a little room so the last letter is not clipped. */
const CELL_PADDING_PX = 20;

/** A, B, ... Z, AA, AB ... like a spreadsheet's column headers. */
export function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** A cell as text: dates in the reader's own format (with the time when there is one), booleans as Excel shows them. */
export function cellText(value: Cell | undefined, locale: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const hasTime = value.getHours() + value.getMinutes() + value.getSeconds() > 0;
    return hasTime ? value.toLocaleString(locale) : value.toLocaleDateString(locale);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

export function clampWidth(width: number): number {
  return Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)));
}

/**
 * The width that shows a column's longest line without cutting it, between the minimum and MAX_AUTO_WIDTH. `measure`
 * returns a text's width in pixels in the table's font (a canvas in the browser, a stub in tests).
 */
export function autoFitWidth(texts: readonly string[], measure: (text: string) => number): number {
  let widest = 0;
  for (const text of texts) {
    for (const line of text.split("\n")) {
      if (line) widest = Math.max(widest, measure(line));
    }
  }
  return Math.round(Math.min(MAX_AUTO_WIDTH, Math.max(MIN_COLUMN_WIDTH, widest + CELL_PADDING_PX)));
}
