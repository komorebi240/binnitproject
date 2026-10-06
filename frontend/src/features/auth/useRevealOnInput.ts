"use client";

import { useEffect, useRef } from "react";
import { FALLBACK_REVEAL_MS, hasMovedEnough, TOUCH_REVEAL_DELAY_MS, type Point } from "./revealOnInput";

/** Presses, keys, scrolling and touches are deliberate: any of them reveals at once. */
const DELIBERATE_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * While `waiting`, calls `onReveal` (once) when the visitor first shows they are there: the pointer starts to move
 * (really moves: see `hasMovedEnough`), or they press, type, scroll or touch. On a device without hover (a phone) there
 * is no pointer to wait for, so it reveals shortly by itself, and a long fallback timer makes sure nobody is ever left
 * with a blank page. Listeners exist only while waiting and are gone after the first reveal.
 */
export function useRevealOnInput(waiting: boolean, onReveal: () => void): void {
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (!waiting) return;
    let baseline: Point | null = null;
    const timers: number[] = [];

    function stop() {
      window.removeEventListener("pointermove", handleMove);
      DELIBERATE_EVENTS.forEach((name) => window.removeEventListener(name, reveal));
      timers.forEach((timer) => window.clearTimeout(timer));
    }

    function reveal() {
      stop();
      onRevealRef.current();
    }

    function handleMove(event: PointerEvent) {
      const here = { x: event.clientX, y: event.clientY };
      // The first position is only a reference: the pointer may have been resting there all along.
      if (!baseline) baseline = here;
      else if (hasMovedEnough(baseline, here)) reveal();
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    DELIBERATE_EVENTS.forEach((name) => window.addEventListener(name, reveal, { passive: true }));
    if (!window.matchMedia("(hover: hover)").matches) timers.push(window.setTimeout(reveal, TOUCH_REVEAL_DELAY_MS));
    timers.push(window.setTimeout(reveal, FALLBACK_REVEAL_MS));

    return stop;
  }, [waiting]);
}
