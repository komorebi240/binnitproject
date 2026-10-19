import type { StoredElement } from "./types";

/** Mirrors WhiteboardScenes.ALLOWED_TYPES on the server: drawing only, no images or embedded pages. */
export const ALLOWED_ELEMENT_TYPES: ReadonlySet<string> = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "freedraw",
  "text",
  "frame",
]);

/**
 * A deleted element is still sent for a day, so everyone who has the board open learns about the deletion when they
 * merge; after that it is dropped to keep the board small (the same rule Excalidraw's own collaboration uses).
 */
export const DELETED_ELEMENT_RETENTION_MS = 24 * 60 * 60 * 1000;

type SyncElement = Pick<StoredElement, "id" | "type" | "version" | "isDeleted" | "updated">;

export function isAllowedElement(element: Pick<StoredElement, "type">): boolean {
  return ALLOWED_ELEMENT_TYPES.has(element.type);
}

/** Elements that exist on the board but could never be saved (an image pasted in, for instance). */
export function unsupportedElements<T extends SyncElement>(elements: readonly T[]): T[] {
  return elements.filter((element) => !element.isDeleted && !isAllowedElement(element));
}

/** What a save sends: every allowed element, and the deleted ones only while they are recent. */
export function syncableElements<T extends SyncElement>(elements: readonly T[], now: number): T[] {
  return elements.filter(
    (element) =>
      isAllowedElement(element) &&
      (!element.isDeleted || (element.updated ?? now) >= now - DELETED_ELEMENT_RETENTION_MS),
  );
}

/** Element versions by id, as last agreed with the server. */
export function versionsOf(elements: readonly SyncElement[]): Map<string, number> {
  return new Map(elements.map((element) => [element.id, element.version]));
}

/** True when something on the canvas changed since the board was last saved or loaded. */
export function hasUnsyncedChanges(elements: readonly SyncElement[], synced: ReadonlyMap<string, number>, now: number): boolean {
  return syncableElements(elements, now).some((element) => synced.get(element.id) !== element.version);
}

/** Longest text dropped or sent onto a board as one note. */
export const MAX_INSERT_LENGTH = 4_000;
const LINE_LENGTH = 60;

/**
 * Text as it should appear in a note on the board: lines wrapped at about LINE_LENGTH characters on word boundaries (a
 * pasted paragraph would otherwise be one very wide line), runs of blank lines collapsed, cut at MAX_INSERT_LENGTH.
 */
export function wrapForBoard(text: string, lineLength = LINE_LENGTH): string {
  const trimmed = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const limited = trimmed.length > MAX_INSERT_LENGTH ? `${trimmed.slice(0, MAX_INSERT_LENGTH).trimEnd()}…` : trimmed;
  return limited
    .split("\n")
    .map((line) => wrapLine(line, lineLength))
    .join("\n");
}

function wrapLine(line: string, lineLength: number): string {
  const words = line.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + 1 + word.length > lineLength) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}
