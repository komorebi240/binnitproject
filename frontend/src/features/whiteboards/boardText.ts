/** The fields of an Excalidraw element this module reads. */
export interface SceneElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  /** What is drawn, with the line breaks Excalidraw added to fit a container. */
  text?: string;
  /** What the person typed, before any wrapping. */
  originalText?: string;
}

export interface SceneRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BoardText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The text on a board inside `rect` (scene coordinates), in reading order: every text element - free text, a shape's
 * label, an arrow's label - whose middle lies in the rectangle. What the person typed is returned, not Excalidraw's
 * wrapped copy, so a label reads as one sentence again.
 */
export function textInRect(elements: readonly SceneElement[], rect: SceneRect): BoardText[] {
  const found: BoardText[] = [];
  for (const element of elements) {
    if (element.type !== "text" || element.isDeleted) continue;
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    if (centerX < rect.minX || centerX > rect.maxX || centerY < rect.minY || centerY > rect.maxY) continue;
    const text = (element.originalText ?? element.text ?? "").trim();
    if (!text) continue;
    found.push({ text, x: element.x, y: element.y, width: element.width, height: element.height });
  }
  // Rows first (elements whose tops are within half a line of each other share a row), then left to right.
  return found.sort((a, b) => (Math.abs(a.y - b.y) < Math.min(a.height, b.height) / 2 ? a.x - b.x : a.y - b.y));
}
