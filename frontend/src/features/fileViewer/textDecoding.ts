/** Longest text shown in the viewer; the rest stays in the downloaded file. */
export const MAX_TEXT_LENGTH = 500_000;

/**
 * The text of a .txt or .csv file: UTF-8 (a leading byte-order mark dropped), or - when the bytes are not valid UTF-8 -
 * Windows-1252, what older Excel and Notepad save on Windows.
 */
export function decodeText(bytes: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
}

const DELIMITERS = [",", ";", "\t"] as const;

/** The delimiter that splits the first line into the most columns (outside quotes). */
function guessDelimiter(firstLine: string): string {
  let best: string = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    let count = 0;
    let quoted = false;
    for (const char of firstLine) {
      if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) count++;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Rows of a CSV file as text cells: quoted fields (with "" for a quote and line breaks inside quotes), comma, semicolon
 * or tab - whichever the first line uses. Stops after `maxRows` rows.
 */
export function parseCsv(text: string, maxRows: number): string[][] {
  const delimiter = guessDelimiter(text.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length && rows.length < maxRows; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if ((field !== "" || row.length > 0) && rows.length < maxRows) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
