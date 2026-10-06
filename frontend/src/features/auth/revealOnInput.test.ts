import { describe, expect, it } from "@jest/globals";
import { FALLBACK_REVEAL_MS, hasMovedEnough, MOVE_THRESHOLD_PX, TOUCH_REVEAL_DELAY_MS } from "./revealOnInput";

describe("hasMovedEnough", () => {
  it("ignores a pointer that has not moved (the browser's synthetic mouse-move events)", () => {
    expect(hasMovedEnough({ x: 300, y: 200 }, { x: 300, y: 200 })).toBe(false);
  });

  it("ignores sensor jitter below the threshold", () => {
    expect(hasMovedEnough({ x: 300, y: 200 }, { x: 303, y: 202 })).toBe(false);
  });

  it("counts a real movement, in any direction", () => {
    expect(hasMovedEnough({ x: 300, y: 200 }, { x: 300 + MOVE_THRESHOLD_PX, y: 200 })).toBe(true);
    expect(hasMovedEnough({ x: 300, y: 200 }, { x: 292, y: 200 })).toBe(true);
    expect(hasMovedEnough({ x: 300, y: 200 }, { x: 306, y: 206 })).toBe(true); // diagonal: about 8.5 px
  });

  it("takes the threshold as a parameter", () => {
    expect(hasMovedEnough({ x: 0, y: 0 }, { x: 20, y: 0 }, 50)).toBe(false);
    expect(hasMovedEnough({ x: 0, y: 0 }, { x: 60, y: 0 }, 50)).toBe(true);
  });
});

describe("timings", () => {
  it("lets a touch screen in quickly, and never leaves anyone waiting for long", () => {
    expect(TOUCH_REVEAL_DELAY_MS).toBeLessThan(1500);
    expect(FALLBACK_REVEAL_MS).toBeGreaterThan(TOUCH_REVEAL_DELAY_MS);
    expect(FALLBACK_REVEAL_MS).toBeLessThanOrEqual(15_000);
  });
});
