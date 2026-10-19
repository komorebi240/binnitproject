"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { OPEN_TABS_STORAGE_KEY as STORAGE_KEY } from "@/lib/session";
import {
  addInSplit,
  closeInSplit,
  moveToSide,
  normalizeSplit,
  paneIds,
  selectInSplit,
  sideOf,
  startSplit,
  type Side,
} from "@/lib/tabSplit";

export interface Tab {
  id: string;
  /** An internal "virtual path" (e.g. "/dashboard/messages?with=5") - never pushed to the real
   * browser URL/history. See TabContentRenderer for how this maps to an actual component. */
  path: string;
  /** Only meaningful for path === "/dashboard" - whether that tab shows the KPI/priority view or
   * the ☰ task-board view. Lives per-tab (not a shared context) so two Home tabs can show
   * different things, unlike the old global HomeViewContext this replaces. */
  boardView: boolean;
  /** Split mode: the half this tab belongs to (missing = left). Ignored while the screen is not split. */
  side?: Side;
}

interface TabsState {
  tabs: Tab[];
  /** The focused tab: sidebar, search and notification clicks act on it. */
  activeTabId: string;
  /** Split-screen partner shown beside the active tab, or null when the screen is not split. */
  splitTabId: string | null;
  /** In split mode: is the focused (active) tab the LEFT pane? Panes keep their side when focus or content changes. */
  activeOnLeft: boolean;
  /** Share of the width the LEFT pane takes in split mode (MIN_SPLIT_RATIO..MAX_SPLIT_RATIO). */
  splitRatio: number;
}

export const DEFAULT_SPLIT_RATIO = 0.5;
export const MIN_SPLIT_RATIO = 0.25;
export const MAX_SPLIT_RATIO = 0.75;

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT_RATIO;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));
}

interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab;
  /** Id of the tab shown next to the active one in split-screen mode (null = not split). */
  splitTabId: string | null;
  /** The two split panes left-to-right, or null when the screen is not split. */
  panes: { leftId: string; rightId: string } | null;
  /** Changes the ACTIVE tab's content to `path` - this is what every in-app "navigation" click
   * (Sidebar, QuickSearch, a notification, a department tile...) does now, instead of a real
   * Next.js route change (CLAUDE.md section 2 decision, confirmed with the user: shareable
   * per-page URLs were explicitly traded away for Chrome-tab-style multitasking). */
  navigateActiveTab: (path: string) => void;
  openNewTab: () => void;
  closeTab: (id: string) => void;
  /** Focuses a tab. In split mode the tab is shown in the half it belongs to (it never changes halves). */
  selectTab: (id: string) => void;
  /** Split mode: show `newTabId` (a tab of the same half) in the pane currently showing `paneTabId`, and focus it. */
  selectTabInPane: (paneTabId: string, newTabId: string) => void;
  /** Split mode: open a fresh Home tab inside the pane currently showing `paneTabId`. */
  openNewTabInPane: (paneTabId: string) => void;
  /** Puts the tabs in this exact order (ignored unless it is a permutation of the open tabs). */
  reorderTabs: (orderedIds: string[]) => void;
  /** Split mode: moves a tab into the half holding `targetPaneId` and shows it there. */
  moveTabToPane: (tabId: string, targetPaneId: string) => void;
  /** Split mode: how wide the left pane is (a share between MIN_SPLIT_RATIO and MAX_SPLIT_RATIO). */
  splitRatio: number;
  setSplitRatio: (ratio: number) => void;
  /** Turns split-screen on (with another tab, or a fresh Home tab if there is none) or off. */
  toggleSplit: () => void;
  setActiveTabBoardView: (boardView: boolean) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const HOME_PATH = "/dashboard";

function newTab(path: string = HOME_PATH): Tab {
  return { id: crypto.randomUUID(), path, boardView: false };
}

function loadInitialState(): TabsState {
  let restored: TabsState | null = null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TabsState>;
      if (parsed.tabs && parsed.tabs.length > 0 && parsed.activeTabId) {
        const splitOk =
          parsed.splitTabId != null &&
          parsed.splitTabId !== parsed.activeTabId &&
          parsed.tabs.some((t) => t.id === parsed.splitTabId);
        restored = normalizeSplit({
          tabs: parsed.tabs,
          activeTabId: parsed.activeTabId,
          splitTabId: splitOk ? (parsed.splitTabId ?? null) : null,
          activeOnLeft: parsed.activeOnLeft ?? true,
          splitRatio: clampSplitRatio(parsed.splitRatio ?? DEFAULT_SPLIT_RATIO),
        });
      }
    }
  } catch {
    // Corrupt/blocked storage - fall through to a fresh single Home tab.
  }
  const state: TabsState =
    restored ??
    (() => {
      const tab = newTab();
      return { tabs: [tab], activeTabId: tab.id, splitTabId: null, activeOnLeft: true, splitRatio: DEFAULT_SPLIT_RATIO };
    })();

  // A real deep link into the app (the Google Drive OAuth callback redirects the actual browser
  // to /dashboard/drive?drive=connected, a URL we don't control) lands the active tab there, then
  // the address bar is reset - tabs aren't URL-driven, so leaving it would be misleading.
  const { pathname, search } = window.location;
  if (pathname.startsWith("/dashboard/")) {
    window.history.replaceState(null, "", HOME_PATH);
    return {
      ...state,
      tabs: state.tabs.map((t) => (t.id === state.activeTabId ? { ...t, path: pathname + search, boardView: false } : t)),
    };
  }
  return state;
}

/**
 * Chrome-tab-style multitasking within the dashboard (user-requested): every open tab is an
 * independent "virtual page" kept alive in the DOM (TabContentRenderer renders all of them,
 * hiding invisible ones with CSS rather than unmounting), so switching tabs never loses in-progress
 * form input or scroll position the way a real route change would. Split-screen shows two of them
 * side by side. State is restored from sessionStorage on reload - just the open tabs/paths and which
 * are visible, never any actual page data (that still comes from TanStack Query's own cache/refetch).
 */
export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TabsState | null>(null);

  // StrictMode (dev) runs effects twice; loadInitialState() resets the address bar as a side
  // effect, so a second run would no longer see the deep link and would overwrite it with the
  // stale stored session - hence the once-only guard.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setState(loadInitialState());
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Nothing else to do if storage is unavailable - the session just won't be restored.
    }
  }, [state]);

  if (!state) return null; // one tick to read sessionStorage before rendering any tab content

  const splitPanes = paneIds(state);
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0] ?? newTab();

  function navigateActiveTab(path: string) {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === prev.activeTabId ? { ...t, path, boardView: false } : t)),
      };
    });
  }

  function openNewTab() {
    const tab = newTab();
    setState((prev) => {
      if (!prev) return prev;
      // The split helpers return only the tab fields; keep the rest (split ratio) from the current state.
      if (prev.splitTabId) return { ...prev, ...addInSplit(prev, tab, prev.activeOnLeft ? "left" : "right") };
      return { ...prev, tabs: [...prev.tabs, tab], activeTabId: tab.id };
    });
  }

  function closeTab(id: string) {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.splitTabId) {
        const next = closeInSplit(prev, id);
        if (next && next.tabs.length > 0) return { ...prev, ...next };
      }
      const remaining = prev.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = newTab();
        return { tabs: [fresh], activeTabId: fresh.id, splitTabId: null, activeOnLeft: true, splitRatio: prev.splitRatio };
      }
      if (id === prev.activeTabId) {
        const activeTabId = remaining[remaining.length - 1]?.id ?? prev.activeTabId;
        return { tabs: remaining, activeTabId, splitTabId: null, activeOnLeft: true, splitRatio: prev.splitRatio };
      }
      return { ...prev, tabs: remaining };
    });
  }

  function selectTab(id: string) {
    setState((prev) => {
      if (!prev || id === prev.activeTabId) return prev;
      if (prev.splitTabId) return { ...prev, ...selectInSplit(prev, id) };
      return { ...prev, activeTabId: id };
    });
  }

  function toggleSplit() {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.splitTabId) return { ...prev, splitTabId: null };
      const partner = prev.tabs.find((t) => t.id !== prev.activeTabId);
      if (partner) return { ...prev, ...startSplit(prev, partner.id) };
      const fresh = newTab();
      return { ...prev, ...startSplit(prev, fresh.id, [...prev.tabs, fresh]) };
    });
  }

  function selectTabInPane(paneTabId: string, newTabId: string) {
    setState((prev) => {
      if (!prev?.splitTabId) return prev;
      const pane = prev.tabs.find((t) => t.id === paneTabId);
      const target = prev.tabs.find((t) => t.id === newTabId);
      // A half only ever shows its own tabs.
      if (!pane || !target || sideOf(pane) !== sideOf(target)) return prev;
      return { ...prev, ...selectInSplit(prev, newTabId) };
    });
  }

  function openNewTabInPane(paneTabId: string) {
    const tab = newTab();
    setState((prev) => {
      if (!prev?.splitTabId) return prev;
      const pane = prev.tabs.find((t) => t.id === paneTabId);
      if (!pane) return prev;
      return { ...prev, ...addInSplit(prev, tab, sideOf(pane)) };
    });
  }

  function setSplitRatio(ratio: number) {
    setState((prev) => (prev ? { ...prev, splitRatio: clampSplitRatio(ratio) } : prev));
  }

  function reorderTabs(orderedIds: string[]) {
    setState((prev) => {
      if (!prev) return prev;
      const byId = new Map(prev.tabs.map((t) => [t.id, t]));
      const isPermutation = orderedIds.length === prev.tabs.length && orderedIds.every((id) => byId.has(id)) && new Set(orderedIds).size === orderedIds.length;
      if (!isPermutation) return prev;
      return { ...prev, tabs: orderedIds.map((id) => byId.get(id) as Tab) };
    });
  }

  function moveTabToPane(tabId: string, targetPaneId: string) {
    setState((prev) => {
      if (!prev?.splitTabId) return prev;
      const targetPane = prev.tabs.find((t) => t.id === targetPaneId);
      if (!targetPane) return prev;
      return { ...prev, ...moveToSide(prev, tabId, sideOf(targetPane)) };
    });
  }

  function setActiveTabBoardView(boardView: boolean) {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === prev.activeTabId ? { ...t, boardView } : t)),
      };
    });
  }

  return (
    <TabsContext.Provider
      value={{
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        activeTab,
        splitTabId: state.splitTabId,
        panes: splitPanes ? { leftId: splitPanes.left, rightId: splitPanes.right } : null,
        navigateActiveTab,
        openNewTab,
        closeTab,
        selectTab,
        selectTabInPane,
        openNewTabInPane,
        reorderTabs,
        moveTabToPane,
        splitRatio: state.splitRatio,
        setSplitRatio,
        toggleSplit,
        setActiveTabBoardView,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabsProvider");
  }
  return context;
}
