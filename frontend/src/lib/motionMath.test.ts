import { describe, expect, it } from "@jest/globals";
import { countDuration, decimalsOf, formatCount, staggerEach, stepDirection, stepProgressRatio } from "./motionMath";

describe("motionMath", () => {
  it("staggers neighbours quickly and caps the whole list", () => {
    expect(staggerEach(0)).toBe(0);
    expect(staggerEach(1)).toBe(0);
    expect(staggerEach(5)).toBeCloseTo(0.05);
    // 100 items would take 5 s at 0.05 each; the total is capped instead.
    expect(staggerEach(100) * 99).toBeLessThanOrEqual(0.45 + 1e-9);
  });

  it("shows whole numbers without decimals and others with one", () => {
    expect(decimalsOf(80)).toBe(0);
    expect(decimalsOf(66.7)).toBe(1);
    expect(formatCount(66.666, 1)).toBe("66.7");
    expect(formatCount(79.6, 0)).toBe("80");
  });

  it("counts longer for bigger numbers but never beyond about a second", () => {
    expect(countDuration(0)).toBeGreaterThan(0);
    expect(countDuration(1000)).toBeGreaterThan(countDuration(5));
    expect(countDuration(10_000_000)).toBeLessThanOrEqual(1.1);
  });

  it("slides forward steps in from the right and backward ones from the left", () => {
    expect(stepDirection(0, 1)).toBe(1);
    expect(stepDirection(2, 1)).toBe(-1);
    expect(stepDirection(1, 1)).toBe(1);
  });

  it("measures how far along a stepper is, within 0..1", () => {
    expect(stepProgressRatio(0, 4)).toBe(0);
    expect(stepProgressRatio(1, 4)).toBeCloseTo(1 / 3);
    expect(stepProgressRatio(3, 4)).toBe(1);
    expect(stepProgressRatio(9, 4)).toBe(1);
    expect(stepProgressRatio(0, 1)).toBe(1);
  });
});
