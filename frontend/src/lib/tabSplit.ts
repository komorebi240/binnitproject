/**
 * Pure rules for split-screen tabs. Every tab belongs to exactly one half ("side", like editor groups):
 * a half lists only its own tabs and shows one of them. Tabs without a stored side (older sessions, or
 * tabs opened while the screen was not split) count as left.
 */

export type Side = "left" | "right";

export interface SplitTab {
  id: string;
  side?: Side;
}

export interface SplitState<T extends SplitTab> {
  tabs: T[];
  /** The focused tab (the tab shown in the focused half). */
  activeTabId: string;
  /** The tab shown in the other half, or null when the screen is not split. */
  splitTabId: string | null;
  /** In split mode: is the focused half the left one? */
  activeOnLeft: boolean;
}

export function sideOf(tab: SplitTab): Side {
  return tab.side ?? "left";
}

export function paneIds<T extends SplitTab>(state: SplitState<T>): { left: string; right: string } | null {
  if (!state.splitTabId) return null;
  return state.activeOnLeft
    ? { left: state.activeTabId, right: state.splitTabId }
    : { left: state.splitTabId, right: state.activeTabId };
}

function withShown<T extends SplitTab>(
  state: SplitState<T>,
  tabs: T[],
  left: string,
  right: string,
  focus: Side,
): SplitState<T> {
  return {
    tabs,
    activeTabId: focus === "left" ? left : right,
    splitTabId: focus === "left" ? right : left,
    activeOnLeft: focus === "left",
  };
}

/** Makes the stored sides consistent with the shown tabs, or drops the split when that is impossible. */
export function normalizeSplit<T extends SplitTab, S extends SplitState<T>>(state: S): S {
  const panes = paneIds(state);
  if (!panes) return state;
  const tabs = state.tabs.map((t) => {
    const side: Side = t.id === panes.right ? "right" : t.id === panes.left ? "left" : sideOf(t);
    return t.side === side ? t : { ...t, side };
  });
  return { ...state, tabs };
}

/** Turns split on: `partnerId` goes to the right half, every other tab stays left, focus is left. */
export function startSplit<T extends SplitTab>(state: SplitState<T>, partnerId: string, tabs: T[] = state.tabs): SplitState<T> {
  const sided = tabs.map((t) => ({ ...t, side: t.id === partnerId ? ("right" as Side) : ("left" as Side) }));
  return { tabs: sided, activeTabId: state.activeTabId, splitTabId: partnerId, activeOnLeft: true };
}

/** Shows `tabId` in its own half and focuses that half. Never moves a tab to the other half. */
export function selectInSplit<T extends SplitTab>(state: SplitState<T>, tabId: string): SplitState<T> {
  const panes = paneIds(state);
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!panes || !tab) return state;
  const side = sideOf(tab);
  return side === "left"
    ? withShown(state, state.tabs, tabId, panes.right, "left")
    : withShown(state, state.tabs, panes.left, tabId, "right");
}

/** Adds an already-built tab to `side` and shows it there. */
export function addInSplit<T extends SplitTab>(state: SplitState<T>, tab: T, side: Side): SplitState<T> {
  const panes = paneIds(state);
  if (!panes) return state;
  const added = { ...tab, side };
  const tabs = [...state.tabs, added];
  return side === "left"
    ? withShown(state, tabs, added.id, panes.right, "left")
    : withShown(state, tabs, panes.left, added.id, "right");
}

/** The tab that takes over a half when `removedId` (the tab it shows) leaves: the nearest one of the same half. */
function replacementFor<T extends SplitTab>(tabs: T[], removedId: string, side: Side): T | undefined {
  const index = tabs.findIndex((t) => t.id === removedId);
  const sameSide = tabs.filter((t) => t.id !== removedId && sideOf(t) === side);
  const before = sameSide.filter((t) => tabs.indexOf(t) < index);
  return before[before.length - 1] ?? sameSide[0];
}

/**
 * Closes a tab in split mode. When it was the last tab of its half the split ends and the other half's
 * tab fills the screen. Returns null when the tab is not part of the state.
 */
export function closeInSplit<T extends SplitTab>(state: SplitState<T>, tabId: string): SplitState<T> | null {
  const panes = paneIds(state);
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!panes || !tab) return null;
  const side = sideOf(tab);
  const remaining = state.tabs.filter((t) => t.id !== tabId);
  const focusSide: Side = state.activeOnLeft ? "left" : "right";
  const shownId = side === "left" ? panes.left : panes.right;
  if (tabId !== shownId) return { ...state, tabs: remaining };

  const replacement = replacementFor(state.tabs, tabId, side);
  if (!replacement) {
    const otherId = side === "left" ? panes.right : panes.left;
    return { tabs: remaining, activeTabId: otherId, splitTabId: null, activeOnLeft: true };
  }
  return side === "left"
    ? withShown(state, remaining, replacement.id, panes.right, focusSide)
    : withShown(state, remaining, panes.left, replacement.id, focusSide);
}

/**
 * Moves a tab into the other half and shows it there (focusing that half). The last tab of a half cannot
 * leave it - that would silently end the split - so the state is returned unchanged.
 */
export function moveToSide<T extends SplitTab>(state: SplitState<T>, tabId: string, target: Side): SplitState<T> {
  const panes = paneIds(state);
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!panes || !tab || sideOf(tab) === target) return state;
  const from = sideOf(tab);
  const replacement = replacementFor(state.tabs, tabId, from);
  if (!replacement) return state;

  const tabs = state.tabs.map((t) => (t.id === tabId ? { ...t, side: target } : t));
  const shownFrom = from === "left" ? panes.left : panes.right;
  const oldPaneId = shownFrom === tabId ? replacement.id : shownFrom;
  return target === "left"
    ? withShown(state, tabs, tabId, oldPaneId, "left")
    : withShown(state, tabs, oldPaneId, tabId, "right");
}
