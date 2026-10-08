import type { QueryClient } from "@tanstack/react-query";

export const OPEN_TABS_STORAGE_KEY = "orbit-open-tabs";
const SIGNED_OUT_ON_PURPOSE_KEY = "orbit-signed-out-on-purpose";

/** Remembers that the person chose to sign out, so the sign-in page does not tell them their session "expired". */
export function markSignedOutOnPurpose(): void {
  try {
    window.sessionStorage.setItem(SIGNED_OUT_ON_PURPOSE_KEY, "1");
  } catch {
    // Storage blocked: the sign-in page may show the "session ended" note after a deliberate sign-out; harmless.
  }
}

/** True once after {@link markSignedOutOnPurpose}; reading it clears it. */
export function consumeSignedOutOnPurpose(): boolean {
  try {
    const marked = window.sessionStorage.getItem(SIGNED_OUT_ON_PURPOSE_KEY) === "1";
    window.sessionStorage.removeItem(SIGNED_OUT_ON_PURPOSE_KEY);
    return marked;
  } catch {
    return false;
  }
}

/**
 * Drops everything the previous account left in the browser: every cached API response (company
 * name, tasks, messages...) and the open dashboard tabs. Call it whenever the signed-in account
 * changes or ends - login, logout, registration, accepting an invitation, an expired session -
 * otherwise the next account briefly sees (or keeps seeing) the last one's company and tabs.
 */
export function resetClientSession(queryClient: QueryClient): void {
  queryClient.clear();
  try {
    window.sessionStorage.removeItem(OPEN_TABS_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was persisted, nothing to clear.
  }
}
