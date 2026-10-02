"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/layout/Sidebar";
import { HomeViewProvider, useHomeView } from "@/components/layout/HomeViewContext";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { PriorityPanel } from "@/features/tasks/components/PriorityPanel";
import { PinnedNoteWidget } from "@/features/notes/components/PinnedNoteWidget";
import { Gear, List, Star } from "@phosphor-icons/react";
import type { UserProfile } from "@/features/auth/types";

const LEVEL_LABELS: Record<string, string> = {
  EXECUTIVE: "Điều hành",
  DEPARTMENT_HEAD: "Trưởng phòng",
  TEAM_LEAD: "Trưởng nhóm",
  EMPLOYEE: "Nhân viên",
};

/**
 * Shared shell for every /dashboard/* page: auth gate (redirect to /login on a 401), header,
 * and the Sidebar nav. Individual pages just render their own panel — see
 * CLAUDE.md section 46.2 (feature components, not pages, own the actual UI logic).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 sm:p-8">
        <div className="mb-6 h-6 w-48 rounded bg-gray-200" />
        <div className="h-40 rounded bg-gray-100" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // redirecting to /login
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <HomeViewProvider>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image's resize pipeline */}
            <img src="/icon.svg" alt="" width={32} height={32} aria-hidden className="shrink-0" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{currentUser.companyName}</h1>
              <p className="text-sm text-gray-500">
                {currentUser.fullName} — {currentUser.title ?? LEVEL_LABELS[currentUser.authorityLevel]}
                {currentUser.departmentName ? ` · ${currentUser.departmentName}` : ""}
                {currentUser.teamName ? ` · ${currentUser.teamName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HeaderIconControls currentUser={currentUser} />
            <Link href="/dashboard/settings" title="Hồ sơ của bạn">
              <Avatar
                avatarUrl={currentUser.avatarUrl}
                fullName={currentUser.fullName}
                presenceStatus={currentUser.presenceStatus}
                size="sm"
              />
            </Link>
            <Button variant="secondary" onClick={handleLogout} loading={logout.isPending}>
              Đăng xuất
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar currentUserAuthorityLevel={currentUser.authorityLevel} />
          <main className="flex-1 px-4 py-6 sm:px-8">
            {/* key={pathname} replays the fade-in on every page change — motion for
                navigation feedback (CLAUDE.md section 25), not decoration. */}
            <div key={pathname} className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>

        <PinnedNoteWidget />
      </div>
    </HomeViewProvider>
  );
}

/**
 * ⭐ priority panel / ☰ board view (Home page only) / 🔔 notifications / ⚙️ settings (moved here
 * from Sidebar, see Phase 6 plan) — icon-only buttons with a `title` tooltip on hover. Phosphor
 * SVG icons, not emoji (UI/UX review pass referencing nextlevelbuilder/ui-ux-pro-max-skill:
 * emoji render inconsistently across OS/browser and don't read as a real icon in a professional
 * UI) — each button also carries a visible focus ring, flagged by the same review as a Critical/
 * High-severity gap for icon-only controls.
 */
function HeaderIconControls({ currentUser }: { currentUser: UserProfile }) {
  const { isBoardView, toggleBoardView, setBoardView } = useHomeView();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const iconButtonClassName =
    "flex h-9 w-9 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  // `isBoardView` only affects what app/dashboard/page.tsx renders (see HomeViewContext's
  // comment) — clicking this from any other page used to just flip the flag with nothing
  // visibly happening. Now it navigates to Home first (forcing the board view on there),
  // and only toggles in place when already on Home.
  function handleBoardViewClick() {
    if (pathname === "/dashboard") {
      toggleBoardView();
    } else {
      setBoardView(true);
      router.push("/dashboard");
    }
  }

  return (
    <>
      <button
        type="button"
        title="Gợi ý ưu tiên"
        aria-label="Gợi ý ưu tiên"
        onClick={() => setPriorityOpen(true)}
        className={iconButtonClassName}
      >
        <Star size={20} aria-hidden />
      </button>
      <button
        type="button"
        title="Xem công việc dạng cột"
        aria-label="Xem công việc dạng cột"
        aria-pressed={isBoardView}
        onClick={handleBoardViewClick}
        className={`${iconButtonClassName} ${isBoardView ? "bg-surface-muted" : ""}`}
      >
        <List size={20} weight={isBoardView ? "fill" : "regular"} aria-hidden />
      </button>
      <NotificationBell />
      <Link href="/dashboard/settings" title="Cài đặt" aria-label="Cài đặt" className={iconButtonClassName}>
        <Gear size={20} aria-hidden />
      </Link>

      <PriorityPanel currentUser={currentUser} open={priorityOpen} onClose={() => setPriorityOpen(false)} />
    </>
  );
}
