import { describe, expect, it } from "@jest/globals";
import { textInRect, type SceneElement } from "./boardText";

function text(value: string, x: number, y: number, extra: Partial<SceneElement> = {}): SceneElement {
  return { type: "text", x, y, width: 100, height: 20, text: value, ...extra };
}

const EVERYWHERE = { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 };

describe("textInRect", () => {
  it("takes text elements whose middle is inside the rectangle, and nothing else", () => {
    const elements = [
      text("inside", 0, 0),
      text("half out", 90, 0),
      { type: "rectangle", x: 0, y: 0, width: 50, height: 50 },
      text("deleted", 10, 10, { isDeleted: true }),
      text("   ", 20, 20),
    ];

    expect(textInRect(elements, { minX: 0, minY: 0, maxX: 120, maxY: 40 }).map((t) => t.text)).toEqual(["inside"]);
  });

  it("returns what was typed rather than the copy wrapped to fit a shape", () => {
    const label = text("Ke hoach\nquy 4", 0, 0, { originalText: "Ke hoach quy 4" });

    expect(textInRect([label], EVERYWHERE)[0]?.text).toBe("Ke hoach quy 4");
  });

  it("reads rows top to bottom and each row left to right", () => {
    const elements = [text("C", 0, 100), text("B", 300, 2), text("A", 0, 0), text("D", 200, 101)];

    expect(textInRect(elements, EVERYWHERE).map((t) => t.text)).toEqual(["A", "B", "C", "D"]);
  });
});
