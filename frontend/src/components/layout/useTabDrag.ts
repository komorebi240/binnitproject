"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  exceedsDragThreshold,
  shiftOffset,
  slotLeft,
  stripGap,
  targetIndex,
  type ChipRect,
} from "@/lib/tabDrag";

/** A tab strip: the single bar, or one half of the bar in split-screen. */
export type StripId = "single" | "left" | "right";

/** What the floating chip and its neighbours need to render while a tab is being dragged. */
export interface DragView {
  id: string;
  strip: StripId;
  /** Slot of the dragged chip among the strip's reorderable chips (-1: it cannot be reordered, only moved). */
  from: number;
  target: number;
  overStrip: StripId;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Sideways distance a neighbour slides to make room (the dragged chip's width plus the gap). */
  step: number;
  /** Released: the floating chip is gliding to its slot before the new order is applied. */
  settling: boolean;
}

interface Options {
  /** Reorderable chip ids of each strip, left to right. */
  items: Partial<Record<StripId, string[]>>;
  onReorder: (strip: StripId, from: number, to: number) => void;
  onMoveToStrip: (id: string, strip: StripId) => void;
}

interface Press {
  id: string;
  strip: StripId;
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
}

interface Session {
  press: Press;
  rects: ChipRect[];
  from: number;
  step: number;
}

const SETTLE_MS = 180;
/** How far above/below a strip the pointer may be and still count as "over" it. */
const STRIP_REACH_PX = 32;
const NO_DRAG_SELECTOR = "[data-no-drag]";
/** A click right after a drag would select the chip that was just moved. */
const CLICK_GUARD_MS = 150;

/**
 * Pointer-driven dragging of tab chips (not HTML5 drag and drop: that gives no control over the
 * floating chip). Press a chip and move: it lifts off the bar as a floating copy that follows the
 * pointer while the other chips slide aside; release over its own strip to reorder, or over the
 * other half of a split bar to show it in that pane. Esc cancels. The geometry is in lib/tabDrag.ts.
 */
export function useTabDrag(options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const chipEls = useRef(new Map<string, HTMLElement>());
  const stripEls = useRef(new Map<StripId, HTMLElement>());
  const pressRef = useRef<Press | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const dragRef = useRef<DragView | null>(null);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const clickGuardUntilRef = useRef(0);
  const [drag, setDragState] = useState<DragView | null>(null);

  const setDrag = useCallback((next: DragView | null) => {
    dragRef.current = next;
    setDragState(next);
  }, []);

  const registerChip = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) chipEls.current.set(id, el);
      else chipEls.current.delete(id);
    },
    [],
  );

  const registerStrip = useCallback(
    (strip: StripId) => (el: HTMLElement | null) => {
      if (el) stripEls.current.set(strip, el);
      else stripEls.current.delete(strip);
    },
    [],
  );

  function stripUnder(x: number, y: number, fallback: StripId): StripId {
    for (const [strip, el] of stripEls.current) {
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top - STRIP_REACH_PX &&
        y <= rect.bottom + STRIP_REACH_PX
      ) {
        return strip;
      }
    }
    return fallback;
  }

  function begin(press: Press, element: HTMLElement) {
    const ids = optionsRef.current.items[press.strip] ?? [];
    const from = ids.indexOf(press.id);
    const rects: ChipRect[] =
      from < 0
        ? []
        : ids.map((id) => {
            const rect = chipEls.current.get(id)?.getBoundingClientRect();
            return { left: rect?.left ?? 0, width: rect?.width ?? 0 };
          });
    sessionRef.current = { press, rects, from, step: press.rect.width + stripGap(rects) };
    element.setPointerCapture(press.pointerId);
  }

  function viewAt(session: Session, x: number, y: number): DragView {
    const { press } = session;
    const left = press.rect.left + (x - press.startX);
    const top = press.rect.top + (y - press.startY);
    const overStrip = stripUnder(x, y, press.strip);
    const reordering = session.from >= 0 && overStrip === press.strip;
    return {
      id: press.id,
      strip: press.strip,
      from: session.from,
      target: reordering ? targetIndex(session.rects, session.from, left) : session.from,
      overStrip,
      left,
      top,
      width: press.rect.width,
      height: press.rect.height,
      step: session.step,
      settling: false,
    };
  }

  function finish(apply: () => void, view: DragView) {
    setDrag({ ...view, settling: true });
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      apply();
      setDrag(null);
    }, SETTLE_MS);
  }

  function cancel() {
    const session = sessionRef.current;
    const view = dragRef.current;
    pressRef.current = null;
    sessionRef.current = null;
    if (!session || !view || view.settling) return;
    clickGuardUntilRef.current = performance.now() + CLICK_GUARD_MS;
    finish(() => undefined, {
      ...view,
      left: session.press.rect.left,
      top: session.press.rect.top,
      target: view.from,
      overStrip: view.strip,
    });
  }

  useEffect(() => {
    if (!drag || drag.settling) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // cancel only reads refs, so it is safe to leave out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, drag?.settling]);

  useEffect(() => () => window.clearTimeout(settleTimerRef.current), []);

  // A press that ends somewhere other than on a chip (pressed on a chip, released just outside it) never reaches the
  // chip's own pointer-up. Without this it would stay "pressed" and the next mouse move would start a phantom drag.
  useEffect(() => {
    function forgetPress() {
      if (!sessionRef.current) pressRef.current = null;
    }
    window.addEventListener("pointerup", forgetPress);
    window.addEventListener("pointercancel", forgetPress);
    return () => {
      window.removeEventListener("pointerup", forgetPress);
      window.removeEventListener("pointercancel", forgetPress);
    };
  }, []);

  function handlers(strip: StripId, id: string) {
    return {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || dragRef.current) return;
        if ((event.target as HTMLElement).closest(NO_DRAG_SELECTOR)) return;
        pressRef.current = {
          id,
          strip,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          rect: event.currentTarget.getBoundingClientRect(),
        };
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const press = pressRef.current;
        if (!press || press.pointerId !== event.pointerId) return;
        if (event.buttons === 0) {
          // The button is up, so whatever started this press or drag has already ended: drop it, never follow the mouse.
          if (sessionRef.current) cancel();
          pressRef.current = null;
          return;
        }
        if (!sessionRef.current) {
          if (!exceedsDragThreshold(event.clientX - press.startX, event.clientY - press.startY))
            return;
          begin(press, event.currentTarget);
        }
        const session = sessionRef.current;
        if (session) setDrag(viewAt(session, event.clientX, event.clientY));
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        const press = pressRef.current;
        const session = sessionRef.current;
        if (!press || press.pointerId !== event.pointerId) return;
        pressRef.current = null;
        sessionRef.current = null;
        if (!session) return; // never moved far enough: an ordinary click
        clickGuardUntilRef.current = performance.now() + CLICK_GUARD_MS;
        const view = viewAt(session, event.clientX, event.clientY);
        if (view.overStrip !== view.strip) {
          setDrag(null);
          optionsRef.current.onMoveToStrip(view.id, view.overStrip);
        } else if (view.from >= 0 && view.target !== view.from) {
          finish(() => optionsRef.current.onReorder(view.strip, view.from, view.target), {
            ...view,
            left: slotLeft(session.rects, view.from, view.target),
            top: press.rect.top,
          });
        } else {
          finish(() => undefined, { ...view, left: press.rect.left, top: press.rect.top });
        }
      },
      onPointerCancel: () => cancel(),
      onLostPointerCapture: () => cancel(),
    };
  }

  /** Inline style for a chip: hidden where the dragged chip came from, sliding aside to make room. */
  function chipStyle(strip: StripId, id: string, index: number): React.CSSProperties | undefined {
    if (!drag || drag.strip !== strip) return undefined;
    if (id === drag.id) return { visibility: "hidden" };
    if (index < 0 || drag.from < 0 || drag.overStrip !== strip) return undefined;
    const shift = shiftOffset(index, drag.from, drag.target, drag.step);
    return shift === 0 ? undefined : { transform: `translateX(${shift}px)` };
  }

  /** True just after a drag, so the click that ends it does not also select the chip. */
  function shouldIgnoreClick(): boolean {
    return performance.now() < clickGuardUntilRef.current;
  }

  return { drag, registerChip, registerStrip, handlers, chipStyle, shouldIgnoreClick };
}
