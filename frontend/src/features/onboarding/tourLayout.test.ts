import { describe, expect, it } from "@jest/globals";
import { CARD_WIDTH, computeTourLayout, VIEWPORT_MARGIN } from "./tourLayout";

const VIEWPORT = { width: 1200, height: 800 };

describe("computeTourLayout", () => {
  it("centres the card when there is no target", () => {
    const layout = computeTourLayout(null, 200, VIEWPORT);
    expect(layout.spotlight).toBeNull();
    expect(layout.card.left).toBe((VIEWPORT.width - CARD_WIDTH) / 2);
    expect(layout.card.top).toBe(300);
  });

  it("frames the target with padding and puts the card below it when there is room", () => {
    const layout = computeTourLayout({ top: 100, left: 400, width: 100, height: 40 }, 200, VIEWPORT);
    expect(layout.spotlight).toEqual({ top: 94, left: 394, width: 112, height: 52 });
    expect(layout.card.top).toBe(100 + 40 + 6 + 10);
  });

  it("puts the card above a target that is near the bottom", () => {
    const layout = computeTourLayout({ top: 700, left: 400, width: 100, height: 40 }, 200, VIEWPORT);
    expect(layout.card.top).toBe(700 - 6 - 10 - 200);
  });

  it("keeps the card inside the window at both edges", () => {
    const leftEdge = computeTourLayout({ top: 50, left: 0, width: 40, height: 40 }, 200, VIEWPORT);
    expect(leftEdge.card.left).toBe(VIEWPORT_MARGIN);
    const rightEdge = computeTourLayout({ top: 50, left: 1180, width: 20, height: 40 }, 200, VIEWPORT);
    expect(rightEdge.card.left).toBe(VIEWPORT.width - CARD_WIDTH - VIEWPORT_MARGIN);
  });

  it("shrinks the card on a narrow window", () => {
    const layout = computeTourLayout(null, 200, { width: 300, height: 600 });
    expect(layout.card.width).toBe(300 - VIEWPORT_MARGIN * 2);
  });
});
