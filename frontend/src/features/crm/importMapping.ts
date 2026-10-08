import type { Column, ColumnMapping, CrmColumnType } from "./types";

/** Where one column of the uploaded file goes. */
export type MappingTarget =
  | { kind: "skip" }
  | { kind: "existing"; columnId: number }
  | { kind: "new"; name: string; type: CrmColumnType };

/** Lower case without accents, so "Điện thoại" and "dien thoai" are the same header. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** What a column that holds a person's name is usually called (folded). A header and a column in this set are the same thing. */
const NAME_WORDS = new Set(["ten", "ho ten", "ho va ten", "ten khach", "ten khach hang", "khach hang", "name", "full name", "fullname", "customer name", "contact name"]);
const EMAIL_WORDS = ["email", "e-mail", "mail", "thu dien tu"];
const PHONE_WORDS = ["phone", "tel", "mobile", "dien thoai", "sdt", "so dt", "di dong"];

function guessType(header: string): CrmColumnType {
  const folded = fold(header);
  if (EMAIL_WORDS.some((word) => folded.includes(word))) return "EMAIL";
  if (PHONE_WORDS.some((word) => folded.includes(word))) return "PHONE";
  return "TEXT";
}

/**
 * A first guess at the mapping, which the person then corrects: a header with the same name as a column of the dataset
 * goes to it (a "name" header goes to the dataset's name column however it is worded); an email or phone header goes to
 * the dataset's first unused email or phone column; anything else becomes a new column named like the header; a blank
 * header is skipped.
 */
export function suggestMapping(headers: string[], columns: Column[]): MappingTarget[] {
  const used = new Set<number>();
  return headers.map((header) => {
    if (!header.trim()) return { kind: "skip" };
    const folded = fold(header);
    const type = guessType(header);

    const sameName = columns.find(
      (column) => !used.has(column.id) && (fold(column.name) === folded || (NAME_WORDS.has(folded) && NAME_WORDS.has(fold(column.name)))),
    );
    const sameKind = type === "TEXT" ? undefined : columns.find((column) => !used.has(column.id) && column.dataType === type);
    const match = sameName ?? sameKind;
    if (match) {
      used.add(match.id);
      return { kind: "existing", columnId: match.id };
    }
    return { kind: "new", name: header.trim(), type };
  });
}

/** True when two columns of the file go to the same column of the dataset (the server refuses that too). */
export function hasRepeatedTarget(targets: MappingTarget[]): boolean {
  const seen = new Set<number>();
  for (const target of targets) {
    if (target.kind !== "existing") continue;
    if (seen.has(target.columnId)) return true;
    seen.add(target.columnId);
  }
  return false;
}

/** True when a column the person asked to create has no name (or two new columns would share one). */
export function hasBadNewColumn(targets: MappingTarget[]): boolean {
  const names = new Set<string>();
  for (const target of targets) {
    if (target.kind !== "new") continue;
    const name = fold(target.name);
    if (!name || names.has(name)) return true;
    names.add(name);
  }
  return false;
}

export function toColumnMappings(targets: MappingTarget[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  targets.forEach((target, sourceIndex) => {
    if (target.kind === "existing") mappings.push({ sourceIndex, columnId: target.columnId });
    if (target.kind === "new") mappings.push({ sourceIndex, newName: target.name.trim(), newType: target.type });
  });
  return mappings;
}
