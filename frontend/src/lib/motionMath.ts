/** Pure numbers behind the animations (kept free of GSAP so they can be unit-tested on their own). */

/** Longest a whole list may take to appear, however many items it has. */
const MAX_STAGGER_TOTAL_SECONDS = 0.45;
const STAGGER_PER_ITEM_SECONDS = 0.05;

/** Seconds between neighbours when a list of `count` items fades in: quick, and never more than ~0.45 s in total. */
export function staggerEach(count: number): number {
  if (count <= 1) return 0;
  return Math.min(STAGGER_PER_ITEM_SECONDS, MAX_STAGGER_TOTAL_SECONDS / (count - 1));
}

/** Digits worth showing after the decimal point: none for whole numbers, otherwise at most one. */
export function decimalsOf(value: number): number {
  return Number.isInteger(value) ? 0 : 1;
}

/** The number as shown while it counts up (the same formatting as the final value, so nothing jumps at the end). */
export function formatCount(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

const COUNT_BASE_SECONDS = 0.5;
const COUNT_MAX_SECONDS = 1.1;

/** Bigger numbers take a little longer to count, but never more than about a second. */
export function countDuration(value: number): number {
  return Math.min(COUNT_MAX_SECONDS, COUNT_BASE_SECONDS + Math.log10(Math.max(1, Math.abs(value)) + 1) * 0.25);
}

/** +1 when moving on to a later step (the new one slides in from the right), -1 when going back. */
export function stepDirection(fromIndex: number, toIndex: number): 1 | -1 {
  return toIndex >= fromIndex ? 1 : -1;
}

/** How far along a stepper the current step is, 0 (first) .. 1 (last); a single step counts as done. */
export function stepProgressRatio(currentIndex: number, stepCount: number): number {
  if (stepCount <= 1) return 1;
  return Math.min(1, Math.max(0, currentIndex / (stepCount - 1)));
}
