"use client";

import { CalendarView } from "@/features/calendar/components/CalendarView";
import { DriveTabContent } from "@/features/drive/components/DriveTabContent";
import { MessengerView } from "@/features/messages/components/MessengerView";
import { BroadcastComposer } from "@/features/messages/components/BroadcastComposer";
import { NotesPanel } from "@/features/notes/components/NotesPanel";
import { CompanyOverview } from "@/features/onboarding/components/CompanyOverview";
import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";
import { ProjectsPanel } from "@/features/projects/components/ProjectsPanel";
import { DepartmentDetailView } from "@/features/organization/components/DepartmentDetailView";
import { DepartmentManager } from "@/features/organization/components/DepartmentManager";
import { UserManager } from "@/features/organization/components/UserManager";
import { SettingsView } from "@/features/settings/components/SettingsView";
import { HomeTabContent } from "@/features/tasks/components/HomeTabContent";
import { TasksPanel } from "@/features/tasks/components/TasksPanel";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  useTabs,
  type Tab,
} from "./TabsContext";

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

  const projectMatch = pathname.match(/^\/dashboard\/projects\/(\d+)$/);
  if (projectMatch) {
    return (
      <ProjectDetailView
        projectId={Number(projectMatch[1])}
        currentUser={currentUser}
        onDeleted={() => navigateActiveTab("/dashboard/projects")}
      />
    );
  }

  switch (pathname) {
    case "/dashboard/projects":
      return <ProjectsPanel currentUser={currentUser} />;
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
            <MessengerView
              currentUser={currentUser}
              initialWith={params.get("with")}
              initialWithName={params.get("name")}
            />
          </Suspense>
        </>
      );
    case "/dashboard/company":
      return <CompanyOverview currentUser={currentUser} />;
    case "/dashboard/calendar":
      return <CalendarView />;
    case "/dashboard/notes":
      return <NotesPanel />;
    case "/dashboard/drive":
      return (
        <DriveTabContent
          driveConnected={params.get("drive") === "connected"}
          driveError={params.get("error")}
        />
      );
    case "/dashboard/settings":
      return <SettingsView onOpenDrive={() => navigateActiveTab("/dashboard/drive")} />;
    default:
      return <HomeTabContent boardView={tab.boardView} />;
  }
}

/** Below this width a pane switches its content to the one-column layouts (see `.pane-narrow` users). */
const NARROW_PANE_PX = 600;
const RATIO_KEY_STEP = 0.02;

/** True while the pane is narrower than NARROW_PANE_PX; a pane that is hidden counts as not narrow. */
function usePaneNarrow(ref: React.RefObject<HTMLElement>, enabled: boolean): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      setNarrow(false);
      return;
    }
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      setNarrow(width > 0 && width < NARROW_PANE_PX);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return narrow;
}

interface TabPaneProps {
  tab: Tab;
  visible: boolean;
  split: boolean;
  focused: boolean;
  side: "left" | "right" | null;
  onFocusPane: () => void;
}

/**
 * One tab's page. It is always the same <section> element, hidden or not: switching element type would
 * make React re-mount the page and lose its form input and scroll position. Each visible pane scrolls on
 * its own; in split mode the unfocused pane is hidden below `md` (a phone shows only the focused one) and
 * a click anywhere in a pane focuses it, so the sidebar/search/notifications act on the pane you work in.
 * A pane narrower than NARROW_PANE_PX gets the `pane-narrow` class so its content can fall back to fewer columns.
 */
function TabPane({ tab, visible, split, focused, side, onFocusPane }: TabPaneProps) {
  const ref = useRef<HTMLElement>(null);
  const narrow = usePaneNarrow(ref, visible);

  if (!visible) {
    return (
      <section ref={ref} className="hidden">
        <TabPage tab={tab} />
      </section>
    );
  }

  const layout = split
    ? `px-4 border-t-2 ${side === "right" ? "md:flex-1 md:basis-0" : "md:flex-none md:basis-[var(--split-left)]"} ${
        focused ? "border-primary" : "hidden border-transparent opacity-90 md:block"
      } ${side === "left" ? "md:border-r md:border-r-gray-200" : ""}`
    : "px-4 sm:px-8 animate-fade-in";

  return (
    <section
      ref={ref}
      style={{ order: side === "right" ? 3 : 1 }}
      onPointerDownCapture={split && !focused ? onFocusPane : undefined}
      aria-label={split ? (focused ? "Khung đang làm việc" : "Khung bên cạnh") : undefined}
      className={`min-w-0 flex-1 overflow-y-auto py-6 ${layout} ${narrow ? "pane-narrow" : ""}`}
    >
      <TabPage tab={tab} />
    </section>
  );
}

/**
 * Handle between the two split panes: drag it (or use the arrow keys) to change how the width is shared;
 * double-click to share it equally again. It floats over the pane border, so it takes no layout space and the
 * tab strips above stay aligned with the panes (both read the same `--split-left`).
 */
function SplitDivider() {
  const { splitRatio, setSplitRatio } = useTabs();

  function ratioFromPointer(event: React.PointerEvent<HTMLElement>): number | null {
    const container = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!container || container.width === 0) return null;
    return (event.clientX - container.left) / container.width;
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Đổi độ rộng hai khung: kéo, hoặc dùng phím mũi tên trái phải; nhấp đúp để chia đều"
      aria-valuemin={Math.round(MIN_SPLIT_RATIO * 100)}
      aria-valuemax={Math.round(MAX_SPLIT_RATIO * 100)}
      aria-valuenow={Math.round(splitRatio * 100)}
      tabIndex={0}
      style={{ left: "calc(var(--split-left) - 6px)" }}
      onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const ratio = ratioFromPointer(event);
        if (ratio !== null) setSplitRatio(ratio);
      }}
      onDoubleClick={() => setSplitRatio(DEFAULT_SPLIT_RATIO)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") setSplitRatio(splitRatio - RATIO_KEY_STEP);
        else if (event.key === "ArrowRight") setSplitRatio(splitRatio + RATIO_KEY_STEP);
        else if (event.key === "Home") setSplitRatio(MIN_SPLIT_RATIO);
        else if (event.key === "End") setSplitRatio(MAX_SPLIT_RATIO);
        else return;
        event.preventDefault();
      }}
      className="group absolute bottom-0 top-0 z-10 hidden w-3 cursor-col-resize touch-none justify-center focus-visible:outline-none md:flex"
    >
      <span className="h-full w-0.5 bg-transparent transition-colors duration-150 group-hover:bg-primary/40 group-focus-visible:bg-primary group-active:bg-primary" />
    </div>
  );
}

/**
 * Renders EVERY open tab at once and hides the inactive ones with CSS instead of unmounting them - that is
 * what makes switching tabs preserve in-progress form input, scroll position, and open menus, like a real
 * browser tab (a conditional render would remount and lose all of that). Cost: every open tab's
 * queries/polling keep running in the background.
 */
export function TabContentRenderer() {
  const { tabs, activeTabId, splitTabId, panes, splitRatio, selectTab } = useTabs();
  const isSplit = splitTabId !== null;

  return (
    <div
      className="relative flex h-full min-h-0"
      style={
        isSplit ? ({ "--split-left": `${splitRatio * 100}%` } as React.CSSProperties) : undefined
      }
    >
      {tabs.map((tab) => {
        const focused = tab.id === activeTabId;
        const side = panes?.leftId === tab.id ? "left" : panes?.rightId === tab.id ? "right" : null;
        return (
          <TabPane
            key={tab.id}
            tab={tab}
            visible={focused || tab.id === splitTabId}
            split={isSplit}
            focused={focused}
            side={side}
            onFocusPane={() => selectTab(tab.id)}
          />
        );
      })}
      {isSplit && <SplitDivider />}
    </div>
  );
}
