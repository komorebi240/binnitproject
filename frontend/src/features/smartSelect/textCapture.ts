import { textSourceAt, type TextSource } from "./textSources";

/** A rectangle on screen, in viewport pixels. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A word (or a whole field's value) found on screen, and where it is. */
export interface Piece {
  text: string;
  box: Box;
}

/** Longest text one capture returns; a selection over a huge table stops here. */
export const MAX_CAPTURE_LENGTH = 10_000;

/** Elements carrying this attribute (and everything inside them) are never captured: Smart select's own windows. */
export const IGNORE_ATTRIBUTE = "data-smart-select-ignore";

const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "CANVAS", "IFRAME", "SELECT", "OPTION"]);
const SKIPPED_INPUT_TYPES = new Set(["password", "hidden", "file", "checkbox", "radio", "submit", "button", "reset", "image", "range", "color"]);

export function boxFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return { left: Math.min(a.x, b.x), top: Math.min(a.y, b.y), right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function center(box: Box): { x: number; y: number } {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

function contains(area: Box, point: { x: number; y: number }): boolean {
  return point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom;
}

/**
 * The pieces as text, in the order they were found (document order, which keeps columns apart): a space between pieces
 * on the same line, a line break when a piece sits lower than the previous one.
 */
export function joinPieces(pieces: readonly Piece[]): string {
  let text = "";
  let previous: Piece | null = null;
  for (const piece of pieces) {
    if (previous) {
      const height = Math.min(previous.box.bottom - previous.box.top, piece.box.bottom - piece.box.top);
      const sameLine = Math.abs(center(piece.box).y - center(previous.box).y) < Math.max(height, 1) / 2;
      text += sameLine ? " " : "\n";
    }
    text += piece.text;
    previous = piece;
    if (text.length >= MAX_CAPTURE_LENGTH) return text.slice(0, MAX_CAPTURE_LENGTH);
  }
  return text;
}

function toBox(rect: DOMRect): Box {
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** True when what is drawn at the middle of `box` is `element` itself (or inside it), not something covering it. */
function isTopmost(element: Element, box: Box): boolean {
  const { x, y } = center(box);
  const hit = document.elementFromPoint(x, y);
  return hit !== null && (hit === element || element.contains(hit) || hit.contains(element));
}

function wordsOf(node: Text, area: Box, range: Range): Piece[] {
  const parent = node.parentElement;
  if (!parent) return [];
  range.selectNodeContents(node);
  if (!Array.from(range.getClientRects()).some((rect) => overlaps(toBox(rect), area))) return [];
  // Text for screen readers only (the sr-only pattern: a clipped 1px box) is not on screen, nor is invisible text.
  const parentBox = parent.getBoundingClientRect();
  if (parentBox.width <= 1 || parentBox.height <= 1 || getComputedStyle(parent).visibility === "hidden") return [];

  const pieces: Piece[] = [];
  for (const match of node.data.matchAll(/\S+/g)) {
    const start = match.index ?? 0;
    range.setStart(node, start);
    range.setEnd(node, start + match[0].length);
    const box = toBox(range.getBoundingClientRect());
    if (contains(area, center(box)) && isTopmost(parent, box)) pieces.push({ text: match[0], box });
  }
  return pieces;
}

function fieldValue(field: HTMLInputElement | HTMLTextAreaElement, area: Box): Piece | null {
  if (field instanceof HTMLInputElement && SKIPPED_INPUT_TYPES.has(field.type)) return null;
  const value = field.value.trim();
  if (!value) return null;
  const box = toBox(field.getBoundingClientRect());
  if (!overlaps(box, area) || !isTopmost(field, box)) return null;
  return { text: value, box };
}

/** The text a registered source (the whiteboard) has inside `area`, keeping only what is not covered by something else. */
function sourcePieces(source: TextSource, area: Box): Piece[] {
  if (source.root.getClientRects().length === 0 || !overlaps(toBox(source.root.getBoundingClientRect()), area)) return [];
  return source.read(area).filter((piece) => isTopmost(source.root, piece.box));
}

/**
 * The text a person sees inside `area`: every word whose middle lies in it and is not hidden behind something else,
 * the values of text fields there, and the text a registered source draws itself (the whiteboard's canvas). Never
 * reads password fields, hidden fields, or Smart select's own windows.
 */
export function captureText(area: Box): string {
  const pieces: Piece[] = [];
  const range = document.createRange();
  let length = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // A text area's own text node is its initial value, not what is typed in it now (read from .value instead).
      if (node.nodeType === Node.TEXT_NODE) {
        return node.parentElement instanceof HTMLTextAreaElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
      const element = node as Element;
      if (SKIPPED_TAGS.has(element.tagName.toUpperCase()) || element.hasAttribute(IGNORE_ATTRIBUTE)) return NodeFilter.FILTER_REJECT;
      const source = textSourceAt(element);
      if (source) {
        // Read here, while the walk reaches it, so its text keeps its place in document order; its own DOM is skipped.
        for (const piece of sourcePieces(source, area)) {
          pieces.push(piece);
          length += piece.text.length + 1;
        }
        return NodeFilter.FILTER_REJECT;
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });

  for (let node = walker.nextNode(); node && length < MAX_CAPTURE_LENGTH; node = walker.nextNode()) {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      const piece = fieldValue(node, area);
      if (piece) {
        pieces.push(piece);
        length += piece.text.length + 1;
      }
      continue;
    }
    if (node instanceof Text && node.data.trim()) {
      for (const piece of wordsOf(node, area, range)) {
        pieces.push(piece);
        length += piece.text.length + 1;
      }
    }
  }
  range.detach();
  return joinPieces(pieces);
}
