/**
 * Pure geometry for floating windows (the pinned notes): where a window may be, how it resizes and
 * how far it may grow on its own. Everything works on plain numbers so the rules that keep a window
 * on screen can be tested without a browser; FloatingWindow.tsx only feeds pointer positions in.
 */

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface WindowLimits {
  minWidth: number;
  minHeight: number;
  /** Gap kept between a window and every edge of the screen. */
  margin: number;
}

export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** A window grows by itself only up to this share of the screen height; beyond it the text scrolls. */
export const AUTO_GROW_MAX_RATIO = 0.7;
export const DEFAULT_WINDOW_WIDTH = 320;
export const DEFAULT_WINDOW_HEIGHT = 200;
const DEFAULT_EDGE_GAP = 16;
const CASCADE_STEP = 28;
const CASCADE_SLOTS = 6;

/** Like Math.min(Math.max(v, lo), hi) but, when the range is empty, the lower bound wins. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Largest rectangle a window may ever occupy: the screen minus the margin on each side. */
export function maxSize(
  viewport: ViewportSize,
  limits: WindowLimits,
): { width: number; height: number } {
  return {
    width: Math.max(1, viewport.width - 2 * limits.margin),
    height: Math.max(1, viewport.height - 2 * limits.margin),
  };
}

/** Forces a window fully inside the screen (size first, then position). */
export function clampGeometry(
  geometry: WindowGeometry,
  viewport: ViewportSize,
  limits: WindowLimits,
): WindowGeometry {
  const max = maxSize(viewport, limits);
  const width = clamp(geometry.width, Math.min(limits.minWidth, max.width), max.width);
  const height = clamp(geometry.height, Math.min(limits.minHeight, max.height), max.height);
  const x = clamp(geometry.x, limits.margin, viewport.width - limits.margin - width);
  const y = clamp(geometry.y, limits.margin, viewport.height - limits.margin - height);
  return { x, y, width, height };
}

/**
 * Resizes from `start` by a pointer delta, dragging the given edge or corner. The opposite edge stays
 * where it is, the size never drops below the minimum and the window never leaves the screen.
 */
export function resizeGeometry(
  start: WindowGeometry,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  viewport: ViewportSize,
  limits: WindowLimits,
): WindowGeometry {
  const { margin } = limits;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  let { x, y, width, height } = start;

  if (edge.includes("e")) {
    width = clamp(start.width + dx, limits.minWidth, viewport.width - margin - start.x);
  }
  if (edge.includes("w")) {
    width = clamp(start.width - dx, limits.minWidth, right - margin);
    x = right - width;
  }
  if (edge.includes("s")) {
    height = clamp(start.height + dy, limits.minHeight, viewport.height - margin - start.y);
  }
  if (edge.includes("n")) {
    height = clamp(start.height - dy, limits.minHeight, bottom - margin);
    y = bottom - height;
  }
  return clampGeometry({ x, y, width, height }, viewport, limits);
}

/** The tallest a window may become on its own (typing), as opposed to by the user's own resizing. */
export function autoGrowCap(viewport: ViewportSize, limits: WindowLimits): number {
  const cap = Math.round(viewport.height * AUTO_GROW_MAX_RATIO);
  return Math.min(Math.max(limits.minHeight, cap), maxSize(viewport, limits).height);
}

/**
 * The window after its content overflowed by `overflowPx`: taller by exactly that much, up to the
 * auto-grow cap. If the extra height would push the bottom edge off screen the window moves up
 * instead (clampGeometry), so growing never lets it spill past the border. A window the user already
 * made taller than the cap is left alone.
 */
export function growToFitContent(
  geometry: WindowGeometry,
  overflowPx: number,
  viewport: ViewportSize,
  limits: WindowLimits,
): WindowGeometry {
  const target = Math.min(geometry.height + overflowPx, autoGrowCap(viewport, limits));
  if (target <= geometry.height) return geometry;
  return clampGeometry({ ...geometry, height: target }, viewport, limits);
}

/** Where the n-th window of a set first opens: bottom-right corner, each further one stepped up-left. */
export function defaultGeometry(
  index: number,
  viewport: ViewportSize,
  limits: WindowLimits,
): WindowGeometry {
  const max = maxSize(viewport, limits);
  const width = Math.min(DEFAULT_WINDOW_WIDTH, max.width);
  const height = Math.min(DEFAULT_WINDOW_HEIGHT, max.height);
  const offset = (index % CASCADE_SLOTS) * CASCADE_STEP;
  return clampGeometry(
    {
      x: viewport.width - DEFAULT_EDGE_GAP - width - offset,
      y: viewport.height - DEFAULT_EDGE_GAP - height - offset,
      width,
      height,
    },
    viewport,
    limits,
  );
}

export interface StoredWindow {
  geometry: WindowGeometry;
  collapsed: boolean;
}

/** Reads a persisted window; anything malformed is treated as "nothing stored". */
export function parseStoredWindow(raw: string | null): StoredWindow | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<WindowGeometry> & { collapsed?: unknown };
    const numbers = [value.x, value.y, value.width, value.height];
    if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return {
      geometry: {
        x: value.x as number,
        y: value.y as number,
        width: value.width as number,
        height: value.height as number,
      },
      collapsed: value.collapsed === true,
    };
  } catch {
    return null;
  }
}

export function serializeStoredWindow(stored: StoredWindow): string {
  return JSON.stringify({ ...stored.geometry, collapsed: stored.collapsed });
}
