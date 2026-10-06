import { describe, expect, it } from "@jest/globals";
import {
  applySubsetOrder,
  exceedsDragThreshold,
  reorder,
  shiftOffset,
  slotLeft,
  stripGap,
  targetIndex,
  type ChipRect,
} from "./tabDrag";

// Four chips 100 wide with a 4 px gap, starting at x = 10.
const RECTS: ChipRect[] = [0, 1, 2, 3].map((i) => ({ left: 10 + i * 104, width: 100 }));

describe("exceedsDragThreshold", () => {
  it("treats tiny movement as a click and larger movement as a drag", () => {
    expect(exceedsDragThreshold(1, 1)).toBe(false);
    expect(exceedsDragThreshold(0, 0)).toBe(false);
    expect(exceedsDragThreshold(5, 0)).toBe(true);
    expect(exceedsDragThreshold(-3, 3)).toBe(true);
  });
});

describe("stripGap", () => {
  it("measures the gap between chips and is 0 for one chip", () => {
    expect(stripGap(RECTS)).toBe(4);
    expect(stripGap([{ left: 0, width: 50 }])).toBe(0);
    expect(stripGap([])).toBe(0);
  });
});

describe("targetIndex", () => {
  it("stays in place until the dragged chip passes a neighbour's centre", () => {
    expect(targetIndex(RECTS, 1, RECTS[1]!.left)).toBe(1);
    expect(targetIndex(RECTS, 1, RECTS[1]!.left + 40)).toBe(1);
    expect(targetIndex(RECTS, 1, RECTS[1]!.left + 120)).toBe(2);
  });

  it("moves left and right across several chips and clamps at the ends", () => {
    expect(targetIndex(RECTS, 3, -500)).toBe(0);
    expect(targetIndex(RECTS, 0, 5000)).toBe(3);
    expect(targetIndex(RECTS, 3, RECTS[1]!.left - 10)).toBe(1);
  });
});

describe("shiftOffset", () => {
  it("slides the chips between the origin and the target by one chip width", () => {
    // chip 0 dragged to slot 2: chips 1 and 2 move left
    expect([0, 1, 2, 3].map((i) => shiftOffset(i, 0, 2, 104))).toEqual([0, -104, -104, 0]);
    // chip 3 dragged to slot 1: chips 1 and 2 move right
    expect([0, 1, 2, 3].map((i) => shiftOffset(i, 3, 1, 104))).toEqual([0, 104, 104, 0]);
    expect([0, 1, 2, 3].map((i) => shiftOffset(i, 2, 2, 104))).toEqual([0, 0, 0, 0]);
  });
});

describe("reorder", () => {
  it("moves one item without mutating the input", () => {
    const input = ["a", "b", "c", "d"];
    expect(reorder(input, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorder(input, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(input).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores a no-op or an invalid source index", () => {
    expect(reorder(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("slotLeft", () => {
  it("is where the chip sits after the reorder", () => {
    expect(slotLeft(RECTS, 0, 0)).toBe(10);
    expect(slotLeft(RECTS, 0, 2)).toBe(10 + 2 * 104);
    expect(slotLeft(RECTS, 3, 1)).toBe(10 + 104);
  });

  it("accounts for chips of different widths", () => {
    const uneven: ChipRect[] = [
      { left: 0, width: 50 },
      { left: 54, width: 120 },
      { left: 178, width: 80 },
    ];
    // moving the 50 wide chip to the end: it follows the 120 and 80 wide ones plus two gaps
    expect(slotLeft(uneven, 0, 2)).toBe(120 + 80 + 2 * 4);
  });
});

describe("applySubsetOrder", () => {
  it("reorders only the subset and leaves other positions alone", () => {
    expect(applySubsetOrder(["a", "x", "b", "y", "c"], ["a", "b", "c"], ["c", "a", "b"])).toEqual([
      "c",
      "x",
      "a",
      "y",
      "b",
    ]);
  });

  it("is the identity for an unchanged order", () => {
    expect(applySubsetOrder(["a", "b"], ["a", "b"], ["a", "b"])).toEqual(["a", "b"]);
  });
});
