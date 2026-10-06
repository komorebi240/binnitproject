"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { CompanyBadge } from "@/features/onboarding/components/CompanyBadge";
import { TourProvider } from "@/features/onboarding/components/OnboardingTour";
import { Sidebar } from "@/components/layout/Sidebar";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { QuickSearch } from "@/components/layout/QuickSearch";
import { TabBar } from "@/components/layout/TabBar";
import { TabContentRenderer } from "@/components/layout/TabContentRenderer";
import { TabsProvider, useTabs } from "@/components/layout/TabsContext";
import { ApiRequestError } from "@/lib/api/client";
import { resetClientSession } from "@/lib/session";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { PriorityPanel } from "@/features/tasks/components/PriorityPanel";
import { PinnedNoteWidget } from "@/features/notes/components/PinnedNoteWidget";
import { PomodoroControl } from "@/features/timer/components/PomodoroControl";
import { PomodoroProvider } from "@/features/timer/components/PomodoroProvider";
import { List, Star } from "@phosphor-icons/react";
import type { UserProfile } from "@/features/auth/types";

/**
 * Shared shell for every /dashboard/* page: auth gate (redirect to /login on a 401), header,
 * Sidebar, and the tab workspace. `children` (whatever Next.js route matched) is deliberately
 * NOT rendered - in-app navigation is tab-driven now (TabsContext), not URL-driven, so the real
 * URL stays at /dashboard and the tabs own what's on screen.
 */
export default function DashboardLayout(_props: { children: React.ReactNode }) {
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Only a real 401 means "logged out" - a transient network error or 429 must not kick the user out.
  const isUnauthenticated = error instanceof ApiRequestError && error.status === 401;

  useEffect(() => {
    if (isUnauthenticated) {
      // The session ended (expired/revoked): don't leave this account's data behind for the next login.
      resetClientSession(queryClient);
      router.replace("/login");
    }
  }, [isUnauthenticated, router]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 sm:p-8">
        <div className="mb-6 h-6 w-48 rounded bg-gray-200" />
        <div className="h-40 rounded bg-gray-100" />
      </div>
    );
  }

  if (!currentUser) {
    if (isUnauthenticated) return null; // redirecting to /login
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Không kết nối được máy chủ.{" "}
        <button type="button" onClick={() => window.location.reload()} className="text-primary underline">
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <TabsProvider>
      <DashboardShell currentUser={currentUser} />
    </TabsProvider>
  );
}

function DashboardShell({ currentUser }: { currentUser: UserProfile }) {
  const { setUserScope } = useTheme();
  const { navigateActiveTab } = useTabs();

  // This account's theme while signed in; back to the default as soon as the dashboard unmounts (logout).
  useEffect(() => {
    setUserScope(currentUser.userId);
    return () => setUserScope(null);
  }, [currentUser.userId, setUserScope]);

  return (
    <TourProvider currentUser={currentUser}>
    <PomodoroProvider key={currentUser.userId} userId={currentUser.userId}>
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          {/* Orbit's own brand mark, not the tenant's company name - this corner is "whose
              product is this" (consistent across every company using the app). */}
          <button
            type="button"
            onClick={() => navigateActiveTab("/dashboard")}
            aria-label="Về trang chủ"
            data-tour="logo"
            title="Về trang chủ"
            className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <OrbitWordmark width={91} height={32} />
          </button>
          <CompanyBadge />
        </div>
        <div className="flex items-center gap-2">
          <HeaderIconControls currentUser={currentUser} />
          <AvatarMenu currentUser={currentUser} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar currentUserAuthorityLevel={currentUser.authorityLevel} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TabBar />
          <main className="min-h-0 flex-1 overflow-hidden">
            <TabContentRenderer />
          </main>
        </div>
      </div>

      <PinnedNoteWidget />
    </div>
    </PomodoroProvider>
    </TourProvider>
  );
}

/**
 * ⭐ priority panel / ☰ board view (acts on the ACTIVE tab) / 🔔 notifications / ⚙️ settings -
 * icon-only buttons with a `title` tooltip on hover. Phosphor SVG icons, not emoji, each with a
 * visible focus ring (UI/UX review pass).
 */
function HeaderIconControls({ currentUser }: { currentUser: UserProfile }) {
  const { activeTab, navigateActiveTab, setActiveTabBoardView } = useTabs();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const iconButtonClassName =
    "flex h-9 w-9 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  const isHome = activeTab.path === "/dashboard";
  const isBoardView = isHome && activeTab.boardView;

  // On a Home tab this toggles that tab's view in place; on any other page it turns the active
  // tab into a Home tab showing the board (the old "navigate home first" fix, tab-scoped now).
  function handleBoardViewClick() {
    if (isHome) {
      setActiveTabBoardView(!activeTab.boardView);
    } else {
      navigateActiveTab("/dashboard");
      setActiveTabBoardView(true);
    }
  }

  return (
    <>
      <QuickSearch currentUserAuthorityLevel={currentUser.authorityLevel} />
      <button
        type="button"
        title="Gợi ý ưu tiên"
        aria-label="Gợi ý ưu tiên"
        data-tour="priority"
        onClick={() => setPriorityOpen(true)}
        className={iconButtonClassName}
      >
        <Star size={20} aria-hidden />
      </button>
      <button
        type="button"
        title="Xem công việc dạng cột"
        aria-label="Xem công việc dạng cột"
        data-tour="board-view"
        aria-pressed={isBoardView}
        onClick={handleBoardViewClick}
        className={`${iconButtonClassName} ${isBoardView ? "bg-surface-muted" : ""}`}
      >
        <List size={20} weight={isBoardView ? "fill" : "regular"} aria-hidden />
      </button>
      <PomodoroControl userId={currentUser.userId} />
      <NotificationBell />
      <PriorityPanel currentUser={currentUser} open={priorityOpen} onClose={() => setPriorityOpen(false)} />
    </>
  );
}
