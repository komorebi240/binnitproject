import { describe, expect, it } from "@jest/globals";
import { LOGO } from "@/components/brand/orbitLogo";
import {
  frameAt,
  INTRO_DURATION,
  ORBIT,
  START_LOGO_DX,
  START_STAGE_SCALE,
  TIMING,
  type LetterTarget,
} from "./introTimeline";

// Plausible slots for O R B I T to the right of the planet (centres of the glyph cells).
const TARGETS: LetterTarget[] = [0, 1, 2, 3, 4].map((i) => ({ x: 78 + i * 24.5, y: 38 }));

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

describe("frameAt", () => {
  it("starts with the planet in the middle and no letter visible", () => {
    const frame = frameAt(0, TARGETS);
    expect(frame.logoDx).toBeCloseTo(START_LOGO_DX, 6);
    expect(frame.letters.every((l) => l.opacity === 0)).toBe(true);
    expect(frame.guideOpacity).toBe(0);
    expect(frame.done).toBe(false);
  });

  it("ends exactly on the finished logo", () => {
    const frame = frameAt(INTRO_DURATION, TARGETS);
    expect(frame.done).toBe(true);
    expect(frame.logoDx).toBe(0);
    expect(frame.logoScale).toBeCloseTo(1, 6);
    expect(frame.guideOpacity).toBe(0);
    frame.letters.forEach((letter, i) => {
      expect(letter.x).toBeCloseTo(TARGETS[i]!.x, 6);
      expect(letter.y).toBeCloseTo(TARGETS[i]!.y, 6);
      expect(letter.scale).toBeCloseTo(1, 6);
      expect(letter.opacity).toBeCloseTo(1, 6);
    });
  });

  it("is still the same finished logo long after the end", () => {
    const later = frameAt(INTRO_DURATION + 30, TARGETS);
    const atEnd = frameAt(INTRO_DURATION, TARGETS);
    expect(later.logoDx).toBe(atEnd.logoDx);
    later.letters.forEach((letter, i) => {
      expect(letter.x).toBeCloseTo(atEnd.letters[i]!.x, 6);
      expect(letter.y).toBeCloseTo(atEnd.letters[i]!.y, 6);
      expect(letter.scale).toBeCloseTo(1, 6);
    });
  });

  it("lasts about three seconds", () => {
    expect(INTRO_DURATION).toBeGreaterThan(2.5);
    expect(INTRO_DURATION).toBeLessThan(3.6);
  });

  it("keeps every visible letter on the orbit while they circle", () => {
    const t =
      (TIMING.letterAppearStart +
        4 * TIMING.letterAppearStagger +
        TIMING.letterAppearDuration +
        TIMING.releaseStart) /
      2;
    const frame = frameAt(t, TARGETS);
    const centerX = LOGO.planet.cx + frame.logoDx;
    const centerY = LOGO.planet.cy + ORBIT.centerYOffset;
    frame.letters.forEach((letter) => {
      expect(letter.opacity).toBeGreaterThan(0.4);
      // A point of an ellipse is between its semi-minor and semi-major axis away from the centre.
      const d = distance(letter.x, letter.y, centerX, centerY);
      expect(d).toBeGreaterThanOrEqual(ORBIT.ry - 0.5);
      expect(d).toBeLessThanOrEqual(ORBIT.rx + 0.5);
    });
  });

  it("makes letters on the near side bigger and brighter than those on the far side", () => {
    const frame = frameAt(1.5, TARGETS);
    const front = frame.letters.filter((l) => !l.behind);
    const back = frame.letters.filter((l) => l.behind);
    expect(front.length).toBeGreaterThan(0);
    expect(back.length).toBeGreaterThan(0);
    expect(Math.min(...front.map((l) => l.scale))).toBeGreaterThan(
      Math.min(...back.map((l) => l.scale)) - 1e-9,
    );
    expect(Math.max(...front.map((l) => l.opacity))).toBeGreaterThan(
      Math.max(...back.map((l) => l.opacity)) - 1e-9,
    );
  });

  it("circles for a while before anything is pushed into place", () => {
    const frame = frameAt(TIMING.releaseStart - 0.01, TARGETS);
    frame.letters.forEach((letter, i) => {
      expect(distance(letter.x, letter.y, TARGETS[i]!.x, TARGETS[i]!.y)).toBeGreaterThan(10);
    });
    expect(frameAt(TIMING.releaseStart - 0.01, TARGETS).logoDx).toBeCloseTo(START_LOGO_DX, 6);
  });

  it("pushes the letters into place from the farthest slot: T first, O last", () => {
    // T has landed while O has barely left its orbit.
    const afterT = frameAt(TIMING.releaseStart + TIMING.settleDuration + 0.001, TARGETS);
    expect(
      distance(afterT.letters[4]!.x, afterT.letters[4]!.y, TARGETS[4]!.x, TARGETS[4]!.y),
    ).toBeLessThan(0.01);
    expect(
      distance(afterT.letters[0]!.x, afterT.letters[0]!.y, TARGETS[0]!.x, TARGETS[0]!.y),
    ).toBeGreaterThan(10);

    // Each letter lands later than the one to its right.
    const landedAt = (index: number): number => {
      for (let t = 0; t <= INTRO_DURATION + 1; t += 0.005) {
        const letter = frameAt(t, TARGETS).letters[index]!;
        if (
          distance(letter.x, letter.y, TARGETS[index]!.x, TARGETS[index]!.y) < 0.05 &&
          letter.scale > 0.999
        )
          return t;
      }
      return Infinity;
    };
    for (let i = 0; i < TARGETS.length - 1; i++) {
      expect(landedAt(i)).toBeGreaterThan(landedAt(i + 1));
    }
  });

  it("never piles letters on top of each other on the way to their slots", () => {
    // Real slot centres of O R B I T (the I is narrow, so its slot is close to T's).
    const slots = [78, 101.2, 124.3, 141, 156.5].map((x) => ({ x, y: 38.1 }));
    let closest = Infinity;
    for (let t = 0; t <= INTRO_DURATION; t += 0.01) {
      const letters = frameAt(t, slots).letters;
      for (let a = 0; a < letters.length; a++) {
        for (let b = a + 1; b < letters.length; b++) {
          // Letters are taller than wide, so vertical gaps count for more.
          closest = Math.min(
            closest,
            Math.hypot(letters[a]!.x - letters[b]!.x, (letters[a]!.y - letters[b]!.y) * 1.4),
          );
        }
      }
    }
    // Never nearer than the final I-T spacing (15.5 px) minus a little rounding room.
    expect(closest).toBeGreaterThan(14);
  });

  it("zooms the scene in while the letters circle and ends at exactly the real logo size", () => {
    expect(frameAt(0, TARGETS).stageScale).toBeCloseTo(START_STAGE_SCALE, 6);
    expect(frameAt(TIMING.releaseStart, TARGETS).stageScale).toBeCloseTo(START_STAGE_SCALE, 6);
    expect(frameAt(INTRO_DURATION, TARGETS).stageScale).toBe(1);
    let previous = Infinity;
    for (let t = 0; t <= INTRO_DURATION + 0.5; t += 0.02) {
      const { stageScale } = frameAt(t, TARGETS);
      expect(stageScale).toBeLessThanOrEqual(previous + 1e-9);
      previous = stageScale;
    }
  });

  it("slides the planet left and never back", () => {
    let previous = Infinity;
    for (let t = 0; t <= INTRO_DURATION + 0.5; t += 0.02) {
      const { logoDx } = frameAt(t, TARGETS);
      expect(logoDx).toBeLessThanOrEqual(previous + 1e-9);
      previous = logoDx;
    }
    expect(previous).toBe(0);
  });

  it("fades the orbit guide in, then out as the letters leave", () => {
    expect(frameAt(1.0, TARGETS).guideOpacity).toBeGreaterThan(0.4);
    expect(
      frameAt(TIMING.releaseStart + TIMING.guideFadeOutDuration, TARGETS).guideOpacity,
    ).toBeCloseTo(0, 9);
  });

  it("never produces NaN or negative sizes, for any time", () => {
    for (let t = -1; t <= INTRO_DURATION + 1; t += 0.037) {
      const frame = frameAt(t, TARGETS);
      for (const letter of frame.letters) {
        expect(Number.isFinite(letter.x) && Number.isFinite(letter.y)).toBe(true);
        expect(letter.scale).toBeGreaterThanOrEqual(0);
        expect(letter.opacity).toBeGreaterThanOrEqual(0);
        expect(letter.opacity).toBeLessThanOrEqual(1.0000001);
      }
      expect(Number.isFinite(frame.logoDx)).toBe(true);
    }
  });
});
