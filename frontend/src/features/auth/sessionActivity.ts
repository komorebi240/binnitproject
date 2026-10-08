/**
 * The server ends a sign-in after two hours without a real action by the person, so the browser tells it about actions.
 * Only actions count: the tab polls the server by itself every 30 seconds and that must not keep a forgotten tab signed in.
 */

/** Real actions of a person; none of them fires by itself. */
export const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

/** An action is reported at most this often - far below the server's idle timeout, far above one request per click. */
export const ACTIVITY_REPORT_INTERVAL_MS = 5 * 60_000;

/** How often a waiting action is looked for when no new action arrives to trigger the report. */
export const ACTIVITY_CHECK_INTERVAL_MS = 30_000;

export function shouldReportActivity(state: { actedSinceLastReport: boolean; lastReportAt: number; now: number }): boolean {
  return state.actedSinceLastReport && state.now - state.lastReportAt >= ACTIVITY_REPORT_INTERVAL_MS;
}
