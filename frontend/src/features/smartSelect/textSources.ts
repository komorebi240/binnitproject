import type { Box, Piece } from "./textCapture";

/**
 * A part of the page whose text is not in the DOM - the whiteboard draws its text on a canvas. It registers here and
 * Smart select asks it for the text inside the selected area instead of walking its elements.
 */
export interface TextSource {
  root: HTMLElement;
  /** The text inside `area` (viewport pixels), each piece with where it is on screen. */
  read: (area: Box) => Piece[];
}

const sources = new Set<TextSource>();

export function registerTextSource(source: TextSource): () => void {
  sources.add(source);
  return () => {
    sources.delete(source);
  };
}

export function textSourceAt(element: Element): TextSource | undefined {
  for (const source of sources) {
    if (source.root === element) return source;
  }
  return undefined;
}
