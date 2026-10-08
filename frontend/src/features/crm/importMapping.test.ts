import { describe, expect, it } from "@jest/globals";
import { fold, hasBadNewColumn, hasRepeatedTarget, suggestMapping, toColumnMappings } from "./importMapping";
import type { Column } from "./types";

const COLUMNS: Column[] = [
  { id: 1, name: "Họ tên", dataType: "TEXT", position: 1 },
  { id: 2, name: "Email", dataType: "EMAIL", position: 2 },
  { id: 3, name: "Điện thoại", dataType: "PHONE", position: 3 },
];

describe("fold", () => {
  it("ignores case and accents, including đ", () => {
    expect(fold("  Điện Thoại ")).toBe("dien thoai");
    expect(fold("HỌ TÊN")).toBe("ho ten");
  });
});

describe("suggestMapping", () => {
  it("sends a header with the same name to that column, ignoring case and accents", () => {
    expect(suggestMapping(["ho ten", "EMAIL", "dien thoai"], COLUMNS)).toEqual([
      { kind: "existing", columnId: 1 },
      { kind: "existing", columnId: 2 },
      { kind: "existing", columnId: 3 },
    ]);
  });

  it("recognises a name header however it is worded", () => {
    expect(suggestMapping(["Họ và tên", "Tên khách hàng"], COLUMNS)).toEqual([
      { kind: "existing", columnId: 1 },
      { kind: "new", name: "Tên khách hàng", type: "TEXT" },
    ]);
    expect(suggestMapping(["Công ty"], COLUMNS)).toEqual([{ kind: "new", name: "Công ty", type: "TEXT" }]);
  });

  it("recognises email and phone headers by what they say", () => {
    expect(suggestMapping(["Mail liên hệ", "SĐT", "Mobile"], COLUMNS)).toEqual([
      { kind: "existing", columnId: 2 },
      { kind: "existing", columnId: 3 },
      { kind: "new", name: "Mobile", type: "PHONE" },
    ]);
  });

  it("makes a new column of the right kind for a header the dataset does not have, and skips a blank one", () => {
    expect(suggestMapping(["Công ty", "", "Work email"], [])).toEqual([
      { kind: "new", name: "Công ty", type: "TEXT" },
      { kind: "skip" },
      { kind: "new", name: "Work email", type: "EMAIL" },
    ]);
  });

  it("never sends two columns of the file to the same column of the dataset", () => {
    const targets = suggestMapping(["Email", "Mail 2"], COLUMNS);
    expect(hasRepeatedTarget(targets)).toBe(false);
    expect(targets[1]).toEqual({ kind: "new", name: "Mail 2", type: "EMAIL" });
  });
});

describe("checks and conversion", () => {
  it("finds a column used twice and a new column with no name or a repeated name", () => {
    expect(hasRepeatedTarget([{ kind: "existing", columnId: 1 }, { kind: "existing", columnId: 1 }])).toBe(true);
    expect(hasBadNewColumn([{ kind: "new", name: "  ", type: "TEXT" }])).toBe(true);
    expect(hasBadNewColumn([{ kind: "new", name: "Note", type: "TEXT" }, { kind: "new", name: "NOTE", type: "TEXT" }])).toBe(true);
    expect(hasBadNewColumn([{ kind: "new", name: "Note", type: "TEXT" }, { kind: "skip" }])).toBe(false);
  });

  it("sends the server only the columns that are used, with their position in the file", () => {
    expect(
      toColumnMappings([{ kind: "skip" }, { kind: "existing", columnId: 2 }, { kind: "new", name: " Company ", type: "TEXT" }]),
    ).toEqual([
      { sourceIndex: 1, columnId: 2 },
      { sourceIndex: 2, newName: "Company", newType: "TEXT" },
    ]);
  });
});
