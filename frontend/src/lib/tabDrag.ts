/** Pure geometry for dragging tab chips around a strip; the pointer handling lives in useTabDrag. */

export interface ChipRect {
  left: number;
  width: number;
}

/** Pointer travel (px) before a press on a chip turns into a drag, so plain clicks still select. */
export const DRAG_THRESHOLD_PX = 4;

export function exceedsDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
}

/** Space between neighbouring chips (0 for a single chip). */
export function stripGap(rects: ChipRect[]): number {
  const [first, second] = rects;
  return first && second ? Math.max(0, second.left - (first.left + first.width)) : 0;
}

/** Slot the dragged chip (index `from`, its left edge now at `draggedLeft`) would take if dropped now. */
export function targetIndex(rects: ChipRect[], from: number, draggedLeft: number): number {
  const dragged = rects[from];
  if (!dragged) return from;
  const center = draggedLeft + dragged.width / 2;
  let target = 0;
  rects.forEach((rect, index) => {
    if (index !== from && rect.left + rect.width / 2 < center) target++;
  });
  return target;
}

/** How far chip `index` slides sideways to make room while `from` hovers over slot `to`. */
export function shiftOffset(index: number, from: number, to: number, step: number): number {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -step;
  if (to < from && index >= to && index < from) return step;
  return 0;
}

export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, moved as T);
  return next;
}

/** Left edge the dragged chip ends on once it has settled into slot `to`. */
export function slotLeft(rects: ChipRect[], from: number, to: number): number {
  const gap = stripGap(rects);
  const order = reorder(
    rects.map((_, index) => index),
    from,
    to,
  );
  let left = rects[0]?.left ?? 0;
  for (const index of order) {
    if (index === from) return left;
    left += (rects[index]?.width ?? 0) + gap;
  }
  return left;
}

/** Puts `newSubsetOrder` into the positions that `subset` members occupy in `allIds`; the rest stay put. */
export function applySubsetOrder(
  allIds: string[],
  subset: string[],
  newSubsetOrder: string[],
): string[] {
  const members = new Set(subset);
  let next = 0;
  return allIds.map((id) => (members.has(id) ? (newSubsetOrder[next++] ?? id) : id));
}
