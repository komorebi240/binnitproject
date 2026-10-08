import { describe, expect, it } from "@jest/globals";
import { parseTerms } from "./parseTerms";

describe("parseTerms", () => {
  it("reads headings, paragraphs and one list per run of items", () => {
    const blocks = parseTerms("## 1. Intro\nFirst paragraph.\n- a\n- b\n\nSecond paragraph.\n## 2. Next\n- c");
    expect(blocks).toEqual([
      { kind: "heading", text: "1. Intro" },
      { kind: "paragraph", text: "First paragraph." },
      { kind: "list", items: ["a", "b"] },
      { kind: "paragraph", text: "Second paragraph." },
      { kind: "heading", text: "2. Next" },
      { kind: "list", items: ["c"] },
    ]);
  });

  it("ignores blank lines, trims and understands Windows line endings", () => {
    expect(parseTerms("\r\n  ## Title  \r\n\r\n  text  \r\n")).toEqual([
      { kind: "heading", text: "Title" },
      { kind: "paragraph", text: "text" },
    ]);
    expect(parseTerms("")).toEqual([]);
  });

  it("a dash without a space is ordinary text", () => {
    expect(parseTerms("-not a list")).toEqual([{ kind: "paragraph", text: "-not a list" }]);
  });
});
