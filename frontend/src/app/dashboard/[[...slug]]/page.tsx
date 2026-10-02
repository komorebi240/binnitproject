/**
 * Intentionally empty: what's on screen is owned by the tab workspace (dashboard/layout.tsx,
 * TabsContext), not by whichever Next.js route matched. This catch-all only exists so real
 * URLs under /dashboard - notably the Google Drive OAuth callback's redirect to
 * /dashboard/drive?drive=connected - resolve instead of 404ing; TabsProvider picks that URL up
 * on load and opens it in the active tab.
 */
export default function DashboardCatchAllPage() {
  return null;
}
