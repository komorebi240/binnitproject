import { describe, expect, it } from "@jest/globals";
import { ellipsePoint, HALO_RING_SLOTS, HALO_RINGS, haloScale, satelliteSlots } from "./orbitHalo";

describe("ellipsePoint", () => {
  it("starts at the right-most point of an untilted ellipse", () => {
    const p = ellipsePoint(200, 60, 0, 0);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(0);
  });

  it("reaches the bottom of an untilted ellipse a quarter of the way round", () => {
    const p = ellipsePoint(200, 60, 0, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(60);
  });

  it("keeps the same distance from the middle at a full turn, whatever the tilt", () => {
    const start = ellipsePoint(200, 60, -18, 0);
    const end = ellipsePoint(200, 60, -18, Math.PI * 2);
    expect(end.x).toBeCloseTo(start.x);
    expect(end.y).toBeCloseTo(start.y);
  });

  it("tilts the right-most point upward for a negative tilt", () => {
    expect(ellipsePoint(200, 60, -18, 0).y).toBeLessThan(0);
  });
});

describe("HALO_RINGS", () => {
  it("lists rings from the smallest outward, each with a longer period", () => {
    for (let i = 1; i < HALO_RINGS.length; i++) {
      expect(HALO_RINGS[i]!.rx).toBeGreaterThan(HALO_RINGS[i - 1]!.rx);
      expect(HALO_RINGS[i]!.period).toBeGreaterThan(HALO_RINGS[i - 1]!.period);
    }
  });
});

describe("satelliteSlots", () => {
  it("gives every ring as many slots as it is meant to carry", () => {
    const slots = satelliteSlots();
    expect(slots).toHaveLength(HALO_RING_SLOTS.reduce((sum, n) => sum + n, 0));
    HALO_RING_SLOTS.forEach((count, ring) => {
      expect(slots.filter((s) => s.ring === ring)).toHaveLength(count);
    });
  });

  it("only uses rings that exist", () => {
    expect(HALO_RING_SLOTS).toHaveLength(HALO_RINGS.length);
  });

  it("spreads the logos of a ring evenly around it", () => {
    const outer = satelliteSlots().filter((s) => s.ring === 2);
    const gap = (Math.PI * 2) / outer.length;
    for (let i = 1; i < outer.length; i++) {
      expect(outer[i]!.start - outer[i - 1]!.start).toBeCloseTo(gap);
    }
  });

  it("never starts two logos at the same place", () => {
    const starts = satelliteSlots().map((s) => `${s.ring}:${s.start.toFixed(3)}`);
    expect(new Set(starts).size).toBe(starts.length);
  });
});

describe("haloScale", () => {
  it("makes the inner ring enclose the content, corners included", () => {
    const content = { width: 475, height: 177 };
    const scale = haloScale(content);
    const inner = HALO_RINGS[0]!;
    const corner = (content.width / 2 / (inner.rx * scale)) ** 2 + (content.height / 2 / (inner.ry * scale)) ** 2;
    expect(corner).toBeLessThan(1);
  });

  it("grows with the content and stays within sensible limits", () => {
    expect(haloScale({ width: 600, height: 300 })).toBeGreaterThan(haloScale({ width: 400, height: 200 }));
    expect(haloScale({ width: 10, height: 10 })).toBe(0.45);
    expect(haloScale({ width: 5000, height: 3000 })).toBe(1.4);
  });
});
