export const SPOTLIGHT_PADDING = 6;
export const CARD_WIDTH = 320;
export const VIEWPORT_MARGIN = 12;
/** Gap between the highlighted element's frame and the card. */
const CARD_GAP = 10;

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CardPosition {
  top: number;
  left: number;
  width: number;
}

export interface TourLayout {
  /** The lit frame around the target, or null when the step has no target (the card is centred instead). */
  spotlight: Rect | null;
  card: CardPosition;
}

/**
 * Where the lit frame and the explanation card go for a step: the frame hugs the target, the card sits below
 * it when it fits (above otherwise) and is kept inside the window; without a target the card is centred.
 */
export function computeTourLayout(
  target: Rect | null,
  cardHeight: number,
  viewport: { width: number; height: number },
): TourLayout {
  const width = Math.min(CARD_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);
  if (!target) {
    return {
      spotlight: null,
      card: { width, top: Math.max(VIEWPORT_MARGIN, (viewport.height - cardHeight) / 2), left: (viewport.width - width) / 2 },
    };
  }

  const below = target.top + target.height + SPOTLIGHT_PADDING + CARD_GAP;
  const fitsBelow = below + cardHeight + VIEWPORT_MARGIN <= viewport.height;
  const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, target.top - SPOTLIGHT_PADDING - CARD_GAP - cardHeight);
  const centered = target.left + target.width / 2 - width / 2;
  const left = Math.min(Math.max(VIEWPORT_MARGIN, centered), viewport.width - width - VIEWPORT_MARGIN);

  return {
    spotlight: {
      top: target.top - SPOTLIGHT_PADDING,
      left: target.left - SPOTLIGHT_PADDING,
      width: target.width + SPOTLIGHT_PADDING * 2,
      height: target.height + SPOTLIGHT_PADDING * 2,
    },
    card: { width, top, left },
  };
}
