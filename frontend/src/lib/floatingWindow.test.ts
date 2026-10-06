import { describe, expect, it } from "@jest/globals";
import {
  autoGrowCap,
  clampGeometry,
  defaultGeometry,
  growToFitContent,
  parseStoredWindow,
  resizeGeometry,
  serializeStoredWindow,
  type WindowGeometry,
  type WindowLimits,
} from "./floatingWindow";

const LIMITS: WindowLimits = { minWidth: 220, minHeight: 140, margin: 8 };
const VIEWPORT = { width: 1000, height: 700 };

function isInside(g: WindowGeometry, viewport = VIEWPORT, margin = LIMITS.margin): boolean {
  return (
    g.x >= margin &&
    g.y >= margin &&
    g.x + g.width <= viewport.width - margin &&
    g.y + g.height <= viewport.height - margin
  );
}

describe("clampGeometry", () => {
  it("leaves a window that already fits untouched", () => {
    const g = { x: 100, y: 100, width: 300, height: 200 };
    expect(clampGeometry(g, VIEWPORT, LIMITS)).toEqual(g);
  });

  it("pulls a window back from every edge", () => {
    expect(
      isInside(clampGeometry({ x: -50, y: -50, width: 300, height: 200 }, VIEWPORT, LIMITS)),
    ).toBe(true);
    expect(
      isInside(clampGeometry({ x: 900, y: 650, width: 300, height: 200 }, VIEWPORT, LIMITS)),
    ).toBe(true);
  });

  it("shrinks a window that is bigger than the screen", () => {
    const g = clampGeometry({ x: 0, y: 0, width: 5000, height: 5000 }, VIEWPORT, LIMITS);
    expect(g).toEqual({ x: 8, y: 8, width: 984, height: 684 });
  });

  it("enforces the minimum size", () => {
    const g = clampGeometry({ x: 100, y: 100, width: 10, height: 10 }, VIEWPORT, LIMITS);
    expect(g.width).toBe(220);
    expect(g.height).toBe(140);
  });

  it("still fits on a screen smaller than the minimum size", () => {
    const tiny = { width: 200, height: 120 };
    const g = clampGeometry({ x: 0, y: 0, width: 300, height: 300 }, tiny, LIMITS);
    expect(isInside(g, tiny)).toBe(true);
  });
});

describe("resizeGeometry", () => {
  const start = { x: 400, y: 300, width: 300, height: 200 };

  it("grows from the bottom-right corner and keeps the top-left corner", () => {
    const g = resizeGeometry(start, "se", 50, 40, VIEWPORT, LIMITS);
    expect(g).toEqual({ x: 400, y: 300, width: 350, height: 240 });
  });

  it("grows from the top-left corner and keeps the bottom-right corner", () => {
    const g = resizeGeometry(start, "nw", -60, -30, VIEWPORT, LIMITS);
    expect(g).toEqual({ x: 340, y: 270, width: 360, height: 230 });
    expect(g.x + g.width).toBe(start.x + start.width);
    expect(g.y + g.height).toBe(start.y + start.height);
  });

  it("changes a single dimension from an edge", () => {
    expect(resizeGeometry(start, "e", 30, 999, VIEWPORT, LIMITS)).toEqual({ ...start, width: 330 });
    expect(resizeGeometry(start, "s", 999, 30, VIEWPORT, LIMITS)).toEqual({
      ...start,
      height: 230,
    });
  });

  it("stops at the minimum size without moving the opposite edge", () => {
    const g = resizeGeometry(start, "nw", 500, 500, VIEWPORT, LIMITS);
    expect(g.width).toBe(220);
    expect(g.height).toBe(140);
    expect(g.x + g.width).toBe(700);
    expect(g.y + g.height).toBe(500);
  });

  it("never lets the window cross the screen border", () => {
    const g = resizeGeometry(start, "se", 5000, 5000, VIEWPORT, LIMITS);
    expect(isInside(g)).toBe(true);
    expect(g.x + g.width).toBe(VIEWPORT.width - LIMITS.margin);
    expect(g.y + g.height).toBe(VIEWPORT.height - LIMITS.margin);
    const h = resizeGeometry(start, "nw", -5000, -5000, VIEWPORT, LIMITS);
    expect(isInside(h)).toBe(true);
    expect(h.x).toBe(LIMITS.margin);
    expect(h.y).toBe(LIMITS.margin);
  });
});

describe("growToFitContent", () => {
  it("grows by exactly the overflow while there is room", () => {
    const g = growToFitContent({ x: 100, y: 100, width: 300, height: 200 }, 60, VIEWPORT, LIMITS);
    expect(g).toEqual({ x: 100, y: 100, width: 300, height: 260 });
  });

  it("moves up instead of spilling past the bottom edge", () => {
    // Bottom edge sits 8 px above the border; growing by 100 px must shift the window up.
    const atBottom = { x: 100, y: 700 - 8 - 200, width: 300, height: 200 };
    const g = growToFitContent(atBottom, 100, VIEWPORT, LIMITS);
    expect(g.height).toBe(300);
    expect(g.y + g.height).toBe(VIEWPORT.height - LIMITS.margin);
    expect(g.y).toBe(atBottom.y - 100);
    expect(isInside(g)).toBe(true);
  });

  it("stops at the auto-grow cap and leaves the rest to scrolling", () => {
    const cap = autoGrowCap(VIEWPORT, LIMITS);
    expect(cap).toBe(490); // 70% of 700
    const g = growToFitContent({ x: 100, y: 100, width: 300, height: 400 }, 1000, VIEWPORT, LIMITS);
    expect(g.height).toBe(cap);
  });

  it("does not shrink a window the user made taller than the cap", () => {
    const tall = { x: 100, y: 50, width: 300, height: 600 };
    expect(growToFitContent(tall, 80, VIEWPORT, LIMITS)).toBe(tall);
  });

  it("never exceeds the screen even when the cap would", () => {
    const small = { width: 400, height: 200 };
    const g = growToFitContent({ x: 8, y: 8, width: 300, height: 150 }, 500, small, LIMITS);
    expect(isInside(g, small)).toBe(true);
  });
});

describe("defaultGeometry", () => {
  it("opens the first window in the bottom-right corner", () => {
    const g = defaultGeometry(0, VIEWPORT, LIMITS);
    expect(g).toEqual({ x: 1000 - 16 - 320, y: 700 - 16 - 200, width: 320, height: 200 });
  });

  it("steps further windows up and to the left, always on screen", () => {
    const first = defaultGeometry(0, VIEWPORT, LIMITS);
    const second = defaultGeometry(1, VIEWPORT, LIMITS);
    expect(second.x).toBe(first.x - 28);
    expect(second.y).toBe(first.y - 28);
    for (let i = 0; i < 20; i++) expect(isInside(defaultGeometry(i, VIEWPORT, LIMITS))).toBe(true);
  });

  it("fits a phone-sized screen", () => {
    const phone = { width: 375, height: 667 };
    const g = defaultGeometry(0, phone, LIMITS);
    expect(isInside(g, phone)).toBe(true);
    expect(g.width).toBe(320);
  });
});

describe("stored windows", () => {
  it("round-trips", () => {
    const stored = { geometry: { x: 1, y: 2, width: 300, height: 200 }, collapsed: true };
    expect(parseStoredWindow(serializeStoredWindow(stored))).toEqual(stored);
  });

  it("treats missing, corrupt or incomplete values as nothing stored", () => {
    expect(parseStoredWindow(null)).toBeNull();
    expect(parseStoredWindow("not json")).toBeNull();
    expect(parseStoredWindow(JSON.stringify({ x: 1, y: 2, width: 3 }))).toBeNull();
    expect(parseStoredWindow(JSON.stringify({ x: "1", y: 2, width: 3, height: 4 }))).toBeNull();
  });

  it("defaults collapsed to false", () => {
    expect(parseStoredWindow(JSON.stringify({ x: 1, y: 2, width: 3, height: 4 }))?.collapsed).toBe(
      false,
    );
  });
});
