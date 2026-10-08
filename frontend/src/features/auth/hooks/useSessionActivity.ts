import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { reportActivity } from "../api/authApi";
import { ACTIVITY_CHECK_INTERVAL_MS, ACTIVITY_EVENTS, shouldReportActivity } from "../sessionActivity";
import { AUTH_ME_QUERY_KEY } from "./useAuth";

/**
 * Keeps the sign-in alive while the person works: real actions (mouse, keyboard, touch) are reported to the server at most
 * every few minutes. A report the server refuses means the session has ended; the current user is then asked for again so
 * the dashboard sends the person to the sign-in page instead of waiting for the next poll.
 */
export function useSessionActivity(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastReportAt = Date.now();
    let actedSinceLastReport = false;
    let reporting = false;

    function reportIfDue() {
      if (reporting || !shouldReportActivity({ actedSinceLastReport, lastReportAt, now: Date.now() })) return;
      const previousReportAt = lastReportAt;
      reporting = true;
      actedSinceLastReport = false;
      lastReportAt = Date.now();
      reportActivity()
        .catch(() => {
          // Not delivered: try again at the next check, and let the current-user query find out whether the session is gone.
          actedSinceLastReport = true;
          lastReportAt = previousReportAt;
          void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
        })
        .finally(() => {
          reporting = false;
        });
    }

    function onAction() {
      actedSinceLastReport = true;
      reportIfDue();
    }

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onAction, { passive: true, capture: true });
    const timer = window.setInterval(reportIfDue, ACTIVITY_CHECK_INTERVAL_MS);
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onAction, { capture: true });
      window.clearInterval(timer);
    };
  }, [queryClient]);
}
