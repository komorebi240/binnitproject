import type { QueryClient } from "@tanstack/react-query";

export const OPEN_TABS_STORAGE_KEY = "orbit-open-tabs";

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
