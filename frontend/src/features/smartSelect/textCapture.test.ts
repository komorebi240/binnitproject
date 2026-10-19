import { describe, expect, it } from "@jest/globals";
import { MAX_CAPTURE_LENGTH, boxFromPoints, joinPieces, overlaps, type Piece } from "./textCapture";

function piece(text: string, left: number, top: number, height = 20): Piece {
  return { text, box: { left, top, right: left + text.length * 8, bottom: top + height } };
}

describe("boxFromPoints", () => {
  it("is the same rectangle whichever way the pointer was dragged", () => {
    const expected = { left: 10, top: 20, right: 110, bottom: 220 };
    expect(boxFromPoints({ x: 10, y: 20 }, { x: 110, y: 220 })).toEqual(expected);
    expect(boxFromPoints({ x: 110, y: 220 }, { x: 10, y: 20 })).toEqual(expected);
  });
});

describe("overlaps", () => {
  const area = { left: 0, top: 0, right: 100, bottom: 100 };

  it("is true for anything sharing some area and false for neighbours that only touch", () => {
    expect(overlaps(area, { left: 90, top: 90, right: 150, bottom: 150 })).toBe(true);
    expect(overlaps(area, { left: 20, top: 20, right: 30, bottom: 30 })).toBe(true);
    expect(overlaps(area, { left: 100, top: 0, right: 150, bottom: 50 })).toBe(false);
    expect(overlaps(area, { left: 0, top: 120, right: 50, bottom: 150 })).toBe(false);
  });
});

describe("joinPieces", () => {
  it("puts words of one line together and starts a new line when the text goes down", () => {
    const pieces = [piece("Họp", 0, 0), piece("lúc", 40, 1), piece("9h30", 80, 0), piece("Phòng", 0, 30), piece("A", 50, 30)];

    expect(joinPieces(pieces)).toBe("Họp lúc 9h30\nPhòng A");
  });

  it("keeps the order it was given, so two columns are read one after the other", () => {
    const pieces = [piece("left1", 0, 0), piece("left2", 0, 30), piece("right1", 200, 0), piece("right2", 200, 30)];

    expect(joinPieces(pieces)).toBe("left1\nleft2\nright1\nright2");
  });

  it("is empty for nothing and stops at the maximum length", () => {
    expect(joinPieces([])).toBe("");
    const many = Array.from({ length: 3_000 }, (_, i) => piece("word", (i % 20) * 50, Math.floor(i / 20) * 30));
    expect(joinPieces(many)).toHaveLength(MAX_CAPTURE_LENGTH);
  });
});
