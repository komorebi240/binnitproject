import { LOGO } from "@/components/brand/orbitLogo";

/**
 * The login intro as a pure function of time: where the planet, the orbit guide and each letter of
 * ORBIT are at second `t`. The story, in order:
 *   1. the planet sits in the middle and the letters fade in one by one on an orbit around it;
 *   2. they circle it (the orbit is tilted like the logo's ring; letters on the far side are smaller,
 *      dimmer and pass behind the planet);
 *   (The whole scene is drawn zoomed in while the letters circle and eases back to normal size as the
 *   word forms, so it reads well on a big screen yet ends at exactly the size of the real logo.)
 *   3. one by one - T first, O last - each letter leaves the orbit and is pushed to its slot in the word,
 *      while the planet slides left to the place it has in the finished logo. Farthest slot first means a
 *      letter never has to cross one that has already landed (releasing O first made letters pile up
 *      on top of each other on the way).
 * Nothing here touches the DOM: OrbitIntroLogo only applies the numbers, which also makes the whole
 * sequence unit-testable.
 */

export const ORBIT = {
  rx: 66,
  ry: 22,
  /** Same slant as the logo's own ring. */
  tilt: -18,
  /** Orbit centre sits a little below the planet centre, like the ring does. */
  centerYOffset: 3,
} as const;

/** The planet starts at the horizontal middle of the logo box and ends at its place on the left. */
export const START_LOGO_DX = LOGO.width / 2 - LOGO.planet.cx;

export const TIMING = {
  planetPulse: 0.5,
  letterAppearStart: 0.3,
  letterAppearStagger: 0.09,
  letterAppearDuration: 0.3,
  /** Seconds to reach full orbital speed (constant acceleration). */
  orbitRamp: 0.5,
  /** Seconds per revolution at full speed. */
  orbitPeriod: 1.3,
  releaseStart: 1.9,
  releaseStagger: 0.1,
  settleDuration: 0.75,
  slideStart: 1.9,
  slideDuration: 1.05,
  guideFadeInStart: 0.15,
  guideFadeInDuration: 0.35,
  guideFadeOutDuration: 0.7,
} as const;

/** Zoom of the whole scene while the letters circle; eases to 1 (the real logo size) as the word forms. */
export const START_STAGE_SCALE = 1.45;

const GUIDE_MAX_OPACITY = 0.5;
/** Phase of the first letter on the orbit at t = 0 (radians). */
const START_PHASE = -Math.PI / 2;

export interface LetterTarget {
  /** Centre of the letter in its final place in the word (viewBox units). */
  x: number;
  y: number;
}

export interface LetterFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** True while the letter is on the far side of the orbit, i.e. drawn behind the planet. */
  behind: boolean;
}

export interface IntroFrame {
  /** Zoom of the whole scene about the middle of the logo box (START_STAGE_SCALE -> 1). */
  stageScale: number;
  /** Horizontal shift of the planet + ring from their final place (START_LOGO_DX -> 0). */
  logoDx: number;
  logoScale: number;
  guideOpacity: number;
  letters: LetterFrame[];
  done: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function easeInOutCubic(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function easeOutCubic(u: number): number {
  return 1 - Math.pow(1 - u, 3);
}

function easeOutBack(u: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

/** Total length of the intro in seconds: when the last letter has landed and the planet has settled. */
export const INTRO_DURATION = Math.max(
  TIMING.releaseStart + (LOGO.text.word.length - 1) * TIMING.releaseStagger + TIMING.settleDuration,
  TIMING.slideStart + TIMING.slideDuration,
);

/** Angle travelled along the orbit by second t: speeds up evenly, then keeps a steady pace. */
function orbitAngle(t: number): number {
  const { orbitRamp, orbitPeriod } = TIMING;
  const progress = t <= 0 ? 0 : t < orbitRamp ? (t * t) / (2 * orbitRamp) : t - orbitRamp / 2;
  return (progress / orbitPeriod) * 2 * Math.PI;
}

function orbitPoint(phase: number, centerX: number, centerY: number) {
  const a = ORBIT.rx * Math.cos(phase);
  const b = ORBIT.ry * Math.sin(phase);
  const tilt = (ORBIT.tilt * Math.PI) / 180;
  return {
    x: centerX + a * Math.cos(tilt) - b * Math.sin(tilt),
    y: centerY + a * Math.sin(tilt) + b * Math.cos(tilt),
    /** 0 = far side of the orbit, 1 = near side. */
    depth: (Math.sin(phase) + 1) / 2,
  };
}

export function frameAt(t: number, targets: LetterTarget[]): IntroFrame {
  const slide = clamp01((t - TIMING.slideStart) / TIMING.slideDuration);
  const logoDx = START_LOGO_DX * (1 - easeInOutCubic(slide));
  const centerX = LOGO.planet.cx + logoDx;
  const centerY = LOGO.planet.cy + ORBIT.centerYOffset;
  const angle = orbitAngle(t);

  const letters = targets.map((target, i): LetterFrame => {
    const phase = START_PHASE + (i * 2 * Math.PI) / targets.length + angle;
    const point = orbitPoint(phase, centerX, centerY);

    const appear = easeOutCubic(
      clamp01(
        (t - (TIMING.letterAppearStart + i * TIMING.letterAppearStagger)) /
          TIMING.letterAppearDuration,
      ),
    );
    const orbitScale = (0.8 + 0.3 * point.depth) * (0.4 + 0.6 * appear);
    const orbitOpacity = (0.5 + 0.5 * point.depth) * appear;

    // Farthest slot (the last letter) leaves first.
    const releaseRank = targets.length - 1 - i;
    const release = clamp01(
      (t - (TIMING.releaseStart + releaseRank * TIMING.releaseStagger)) / TIMING.settleDuration,
    );
    const landed = easeInOutCubic(release);

    return {
      x: lerp(point.x, target.x, landed),
      y: lerp(point.y, target.y, landed),
      scale: lerp(orbitScale, 1, landed),
      opacity: lerp(orbitOpacity, 1, landed),
      behind: release === 0 && Math.sin(phase) < 0,
    };
  });

  const guideIn = clamp01((t - TIMING.guideFadeInStart) / TIMING.guideFadeInDuration);
  const guideOut = 1 - clamp01((t - TIMING.releaseStart) / TIMING.guideFadeOutDuration);

  const pullBack = clamp01((t - TIMING.releaseStart) / (INTRO_DURATION - TIMING.releaseStart));

  return {
    stageScale: lerp(START_STAGE_SCALE, 1, easeInOutCubic(pullBack)),
    logoDx,
    logoScale: lerp(0.9, 1, easeOutBack(clamp01(t / TIMING.planetPulse))),
    guideOpacity: GUIDE_MAX_OPACITY * guideIn * guideOut,
    letters,
    done: t >= INTRO_DURATION,
  };
}
