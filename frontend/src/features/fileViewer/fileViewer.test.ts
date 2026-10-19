import { describe, expect, it } from "@jest/globals";
import { fileViewerPath, parseFileViewerPath, previewKind } from "./fileSources";
import { decodeText, parseCsv } from "./textDecoding";

describe("previewKind", () => {
  it("trusts the server's content type first, then the extension", () => {
    expect(previewKind("report.bin", "application/pdf")).toBe("pdf");
    expect(previewKind("ke-hoach.DOCX", null)).toBe("docx");
    expect(previewKind("so-lieu.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=binary")).toBe("xlsx");
    expect(previewKind("list.csv")).toBe("csv");
    expect(previewKind("note.txt", "text/plain")).toBe("text");
  });

  it("offers no preview for legacy Office files, slides and archives", () => {
    expect(previewKind("old.doc", "application/msword")).toBeNull();
    expect(previewKind("old.xls")).toBeNull();
    expect(previewKind("deck.pptx")).toBeNull();
    expect(previewKind("files.zip", "application/zip")).toBeNull();
    expect(previewKind("no-extension")).toBeNull();
  });
});

describe("file viewer paths", () => {
  it("round-trip both kinds of attachment", () => {
    const chat = { kind: "chat" as const, attachmentId: 12 };
    const task = { kind: "task" as const, taskId: 5, attachmentId: 9 };

    expect(fileViewerPath(chat, "Báo cáo Q4.docx")).toBe("/dashboard/files/chat/12?name=B%C3%A1o%20c%C3%A1o%20Q4.docx");
    expect(parseFileViewerPath("/dashboard/files/chat/12")).toEqual(chat);
    expect(parseFileViewerPath(fileViewerPath(task, "a.pdf").split("?")[0] as string)).toEqual(task);
  });

  it("refuses anything else", () => {
    expect(parseFileViewerPath("/dashboard/files/chat/abc")).toBeNull();
    expect(parseFileViewerPath("/dashboard/files/task/5")).toBeNull();
    expect(parseFileViewerPath("/dashboard/files/drive/1")).toBeNull();
  });
});

describe("decodeText", () => {
  it("reads UTF-8 without its byte-order mark", () => {
    const bytes = new TextEncoder().encode("﻿Xin chào").buffer as ArrayBuffer;
    expect(decodeText(bytes)).toBe("Xin chào");
  });

  it("falls back to Windows-1252 for bytes that are not UTF-8", () => {
    const bytes = new Uint8Array([0x43, 0x61, 0x66, 0xe9]).buffer; // "Café" saved by an old Windows program
    expect(decodeText(bytes)).toBe("Café");
  });
});

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and line breaks inside quotes", () => {
    const rows = parseCsv('Ten,Ghi chu\r\n"Nguyen, An","Noi ""nhanh""\nlen"\nBinh,\n', 100);

    expect(rows).toEqual([
      ["Ten", "Ghi chu"],
      ["Nguyen, An", 'Noi "nhanh"\nlen'],
      ["Binh", ""],
    ]);
  });

  it("detects semicolons and tabs, and stops at the row limit", () => {
    expect(parseCsv("a;b;c\n1;2;3", 10)).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a\tb\n1\t2", 10)).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("1\n2\n3\n4", 2)).toEqual([["1"], ["2"]]);
  });
});
