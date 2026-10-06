/**
 * Rules for when the landing page's two buttons appear: not when the intro ends, but when the visitor first shows they
 * are there. Pure numbers and a pure test, so they can be unit-tested; the listeners live in useRevealOnInput.ts.
 */

/** How far (px) the pointer must travel before it counts as "moving": sensor jitter and the synthetic mouse-move events a browser fires when the layout shifts under a resting pointer must not reveal anything. */
export const MOVE_THRESHOLD_PX = 8;

/** Touch screens have no pointer to move, so the buttons come by themselves this long (ms) after the sequence ends. */
export const TOUCH_REVEAL_DELAY_MS = 700;

/** Nobody is left staring at a blank page (no pointer, a screen reader, voice control): the buttons come anyway after this long (ms). */
export const FALLBACK_REVEAL_MS = 12_000;

export interface Point {
  x: number;
  y: number;
}

/** True once the pointer has really moved away from where it first was seen. */
export function hasMovedEnough(from: Point, to: Point, threshold: number = MOVE_THRESHOLD_PX): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) >= threshold;
}
