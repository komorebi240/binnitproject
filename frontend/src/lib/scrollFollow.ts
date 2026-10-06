/** How close to the bottom (in pixels) still counts as "reading the latest messages". */
export const NEAR_BOTTOM_PX = 80;

/** True when a scrollable area is scrolled to (or almost to) its end. */
export function isNearBottom(
  area: { scrollTop: number; clientHeight: number; scrollHeight: number },
  threshold = NEAR_BOTTOM_PX,
): boolean {
  return area.scrollHeight - area.scrollTop - area.clientHeight <= threshold;
}

export type FollowAction = "scroll" | "offer-jump" | "none";

/**
 * What a chat should do when its content changed: keep following the newest line when the reader is at the bottom
 * (or it is the first time, or they just sent something), but never drag someone who scrolled up to read older
 * messages - offer a "new messages" button instead.
 */
export function followAction(state: { firstContent: boolean; atBottom: boolean; ownLatest: boolean; changed: boolean }): FollowAction {
  if (state.firstContent || state.ownLatest) return "scroll";
  if (!state.changed) return "none";
  return state.atBottom ? "scroll" : "offer-jump";
}
