import { describe, expect, it } from "@jest/globals";
import { foldText, matchesAllWords, splitByQuery } from "./textMatch";

describe("textMatch", () => {
  it("folds accents, case and đ", () => {
    expect(foldText("Công Việc Đẹp")).toBe("cong viec dep");
  });

  it("matches without typing accents and in any word order", () => {
    expect(matchesAllWords("Lịch của tôi", "lich toi")).toBe(true);
    expect(matchesAllWords("Lịch của tôi", "toi lich")).toBe(true);
    expect(matchesAllWords("Lịch của tôi", "note")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchesAllWords("anything", "  ")).toBe(true);
  });

  it("marks the matching part of the original text", () => {
    expect(splitByQuery("Công việc", "viec")).toEqual([
      { text: "Công ", match: false },
      { text: "việc", match: true },
    ]);
  });

  it("marks every word of the query", () => {
    expect(splitByQuery("Lịch của tôi", "lich toi")).toEqual([
      { text: "Lịch", match: true },
      { text: " của ", match: false },
      { text: "tôi", match: true },
    ]);
  });

  it("returns the whole text unmarked when nothing matches", () => {
    expect(splitByQuery("Home", "xyz")).toEqual([{ text: "Home", match: false }]);
  });

  it("keeps the original characters when the query has no accents", () => {
    const parts = splitByQuery("Đăng ký", "dang");
    expect(parts[0]).toEqual({ text: "Đăng", match: true });
  });
});
