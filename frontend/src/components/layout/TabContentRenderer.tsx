"use client";

import { CalendarView } from "@/features/calendar/components/CalendarView";
import { DriveTabContent } from "@/features/drive/components/DriveTabContent";
import { MessengerView } from "@/features/messages/components/MessengerView";
import { BroadcastComposer } from "@/features/messages/components/BroadcastComposer";
import { NotesPanel } from "@/features/notes/components/NotesPanel";
import { DepartmentDetailView } from "@/features/organization/components/DepartmentDetailView";
import { DepartmentManager } from "@/features/organization/components/DepartmentManager";
import { UserManager } from "@/features/organization/components/UserManager";
import { SettingsView } from "@/features/settings/components/SettingsView";
import { HomeTabContent } from "@/features/tasks/components/HomeTabContent";
import { TasksPanel } from "@/features/tasks/components/TasksPanel";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { Suspense } from "react";
import { useTabs, type Tab } from "./TabsContext";

function TabPage({ tab }: { tab: Tab }) {
  const { data: currentUser } = useCurrentUser();
  const { navigateActiveTab } = useTabs();
  if (!currentUser) return null;

  const [pathname = "", query = ""] = tab.path.split("?");
  const params = new URLSearchParams(query);

  const departmentMatch = pathname.match(/^\/dashboard\/departments\/(\d+)$/);
  if (departmentMatch) {
    return (
      <DepartmentDetailView
        departmentId={Number(departmentMatch[1])}
        onDeleted={() => navigateActiveTab("/dashboard/departments")}
      />
    );
  }

  switch (pathname) {
    case "/dashboard/departments":
      return <DepartmentManager currentUser={currentUser} />;
    case "/dashboard/users":
      return <UserManager currentUser={currentUser} />;
    case "/dashboard/tasks":
      return <TasksPanel currentUser={currentUser} />;
    case "/dashboard/messages":
      return (
        <>
          <h1 className="mb-4 text-lg font-semibold text-gray-900">Tin nhắn</h1>
          {currentUser.systemAccount && <BroadcastComposer />}
          <Suspense fallback={null}>
            <MessengerView currentUser={currentUser} initialWith={params.get("with")} initialWithName={params.get("name")} />
          </Suspense>
        </>
      );
    case "/dashboard/calendar":
      return <CalendarView />;
    case "/dashboard/notes":
      return <NotesPanel />;
    case "/dashboard/drive":
      return <DriveTabContent driveConnected={params.get("drive") === "connected"} driveError={params.get("error")} />;
    case "/dashboard/settings":
      return <SettingsView onOpenDrive={() => navigateActiveTab("/dashboard/drive")} />;
    default:
      return <HomeTabContent boardView={tab.boardView} />;
  }
}

/**
 * Renders EVERY open tab at once and hides the inactive ones with CSS (`hidden`) instead of
 * unmounting them - that's what makes switching tabs preserve in-progress form input, scroll
 * position, and open menus, like a real browser tab (a conditional render would remount and
 * lose all of that). Cost: every open tab's queries/polling keep running in the background.
 */
export function TabContentRenderer() {
  const { tabs, activeTabId, splitTabId, panes, selectTab } = useTabs();
  const isSplit = splitTabId !== null;

  return (
    <div className="flex h-full min-h-0">
      {tabs.map((tab) => {
        const isFocused = tab.id === activeTabId;
        const isVisible = isFocused || tab.id === splitTabId;
        if (!isVisible) {
          return (
            <div key={tab.id} className="hidden">
              <TabPage tab={tab} />
            </div>
          );
        }
        return (
          // Each visible tab is its own scrolling pane. In split mode the unfocused pane is hidden
          // below `md` (a phone shows only the focused one) and a click anywhere in a pane focuses it,
          // so the sidebar/search/notifications keep acting on the pane you are working in.
          <section
            key={tab.id}
            style={{ order: isSplit && tab.id === panes?.rightId ? 2 : 1 }}
            onPointerDownCapture={isSplit && !isFocused ? () => selectTab(tab.id) : undefined}
            aria-label={isSplit ? (isFocused ? "Khung đang làm việc" : "Khung bên cạnh") : undefined}
            className={`min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 ${
              isSplit
                ? `border-t-2 md:basis-1/2 ${isFocused ? "border-primary" : "hidden border-transparent opacity-90 md:block"} ${tab.id === panes?.leftId ? "md:border-r md:border-r-gray-200" : ""}`
                : "animate-fade-in"
            }`}
          >
            <TabPage tab={tab} />
          </section>
        );
      })}
    </div>
  );
}
