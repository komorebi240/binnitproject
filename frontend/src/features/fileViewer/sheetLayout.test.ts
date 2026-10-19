import { describe, expect, it } from "@jest/globals";
import {
  MAX_AUTO_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  autoFitWidth,
  cellText,
  clampWidth,
  columnName,
} from "./sheetLayout";

// Four pixels per character keeps the expected widths obvious.
const measure = (text: string) => text.length * 4;

describe("columnName", () => {
  it("names columns like a spreadsheet", () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
});

describe("cellText", () => {
  it("shows empty cells as nothing, booleans as Excel does and numbers as they are", () => {
    expect(cellText(null, "vi-VN")).toBe("");
    expect(cellText(undefined, "vi-VN")).toBe("");
    expect(cellText(true, "en-US")).toBe("TRUE");
    expect(cellText(1234.5, "vi-VN")).toBe("1234.5");
    expect(cellText("0912 345 678", "vi-VN")).toBe("0912 345 678");
  });

  it("shows a date without a time as a date only", () => {
    expect(cellText(new Date(2026, 9, 20), "en-US")).toBe("10/20/2026");
    expect(cellText(new Date(2026, 9, 20, 9, 30), "en-US")).toContain("9:30");
  });
});

describe("autoFitWidth", () => {
  it("fits the longest line of the column, with room for the padding", () => {
    expect(autoFitWidth(["short", "a much longer value", ""], measure)).toBe(19 * 4 + 20);
    expect(autoFitWidth(["two\nline cell with a long second line"], measure)).toBe(33 * 4 + 20);
  });

  it("stays between the minimum and the automatic maximum", () => {
    expect(autoFitWidth(["", "x"], measure)).toBe(MIN_COLUMN_WIDTH);
    expect(autoFitWidth(["x".repeat(2000)], measure)).toBe(MAX_AUTO_WIDTH);
  });
});

describe("clampWidth", () => {
  it("keeps a dragged width usable", () => {
    expect(clampWidth(5)).toBe(MIN_COLUMN_WIDTH);
    expect(clampWidth(5000)).toBe(MAX_COLUMN_WIDTH);
    expect(clampWidth(200.4)).toBe(200);
  });
});
