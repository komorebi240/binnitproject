import { describe, expect, it } from "@jest/globals";
import {
  DELETED_ELEMENT_RETENTION_MS,
  MAX_INSERT_LENGTH,
  hasUnsyncedChanges,
  syncableElements,
  unsupportedElements,
  versionsOf,
  wrapForBoard,
} from "./sceneSync";

const NOW = 1_800_000_000_000;

function element(id: string, version: number, extra: Partial<{ type: string; isDeleted: boolean; updated: number }> = {}) {
  return { id, version, type: "rectangle", updated: NOW, ...extra };
}

describe("syncableElements", () => {
  it("keeps drawings and recent deletions, drops old deletions and anything the server would refuse", () => {
    const elements = [
      element("shape", 1),
      element("freshlyDeleted", 2, { isDeleted: true, updated: NOW - 1000 }),
      element("longDeleted", 3, { isDeleted: true, updated: NOW - DELETED_ELEMENT_RETENTION_MS - 1 }),
      element("picture", 1, { type: "image" }),
      element("page", 1, { type: "embeddable" }),
    ];

    expect(syncableElements(elements, NOW).map((e) => e.id)).toEqual(["shape", "freshlyDeleted"]);
  });
});

describe("unsupportedElements", () => {
  it("lists images and embeds still on the board, not deleted ones", () => {
    const elements = [element("picture", 1, { type: "image" }), element("gone", 1, { type: "image", isDeleted: true }), element("shape", 1)];

    expect(unsupportedElements(elements).map((e) => e.id)).toEqual(["picture"]);
  });
});

describe("hasUnsyncedChanges", () => {
  const saved = [element("a", 1), element("b", 4)];

  it("is false right after a save or a load", () => {
    expect(hasUnsyncedChanges(saved, versionsOf(saved), NOW)).toBe(false);
  });

  it("notices an edited, a new and a deleted element", () => {
    const synced = versionsOf(saved);
    expect(hasUnsyncedChanges([element("a", 2), element("b", 4)], synced, NOW)).toBe(true);
    expect(hasUnsyncedChanges([...saved, element("c", 1)], synced, NOW)).toBe(true);
    expect(hasUnsyncedChanges([element("a", 2, { isDeleted: true }), element("b", 4)], synced, NOW)).toBe(true);
  });

  it("ignores what is never saved anyway", () => {
    expect(hasUnsyncedChanges([...saved, element("picture", 1, { type: "image" })], versionsOf(saved), NOW)).toBe(false);
  });
});

describe("wrapForBoard", () => {
  it("wraps long lines on word boundaries and keeps the author's own line breaks", () => {
    const wrapped = wrapForBoard("one two three four five six\nseven", 10);

    expect(wrapped).toBe("one two\nthree four\nfive six\nseven");
  });

  it("collapses runs of blank lines, trims, and cuts very long text", () => {
    expect(wrapForBoard("  a\r\n\r\n\r\n\r\nb  ")).toBe("a\n\nb");
    const cut = wrapForBoard("x ".repeat(MAX_INSERT_LENGTH));
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.replace(/\n/g, " ").length).toBeLessThanOrEqual(MAX_INSERT_LENGTH + 1);
  });

  it("never breaks a single long word", () => {
    expect(wrapForBoard("https://example.com/a/very/long/path", 10)).toBe("https://example.com/a/very/long/path");
  });
});
