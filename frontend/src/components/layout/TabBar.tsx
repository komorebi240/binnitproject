"use client";

import { Columns, Plus, X } from "@phosphor-icons/react";
import { useTabs, type Tab } from "./TabsContext";
import { describeTab } from "./tabMeta";

type ChipState = "focused" | "partner" | "idle";

const CHIP_STATE_CLASSES: Record<ChipState, string> = {
  focused: "border-gray-200 bg-surface text-gray-900",
  partner: "border-gray-200 bg-surface/60 text-gray-700",
  idle: "border-transparent text-gray-500 hover:bg-white/60",
};

function TabChip({
  tab,
  state,
  canClose,
  onSelect,
  onClose,
}: {
  tab: Tab;
  state: ChipState;
  canClose: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const { label, icon: TabIcon } = describeTab(tab.path);
  return (
    <div
      className={`animate-tab-in group flex max-w-[180px] shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-sm transition-colors duration-150 ${CHIP_STATE_CLASSES[state]}`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-1.5">
        <TabIcon size={14} aria-hidden className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {canClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Đóng tab ${label}`}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-opacity duration-150 hover:bg-gray-200 hover:text-gray-700 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X size={11} weight="bold" aria-hidden />
        </button>
      )}
    </div>
  );
}

function NewTabButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Mở tab mới"
      aria-label="Mở tab mới"
      className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center self-center rounded text-gray-500 transition-colors duration-150 hover:bg-white/60 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Plus size={16} aria-hidden />
    </button>
  );
}

function SplitToggle({ split, onClick }: { split: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={split ? "Tắt chia đôi màn hình" : "Chia đôi màn hình"}
      aria-label={split ? "Tắt chia đôi màn hình" : "Chia đôi màn hình"}
      aria-pressed={split}
      data-tour="split-screen"
      className={`mb-0.5 ml-auto hidden h-7 shrink-0 items-center gap-1.5 self-center rounded px-2 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex ${
        split ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-white/60 hover:text-gray-900"
      }`}
    >
      <Columns size={16} aria-hidden />
      {split ? "Bỏ chia đôi" : "Chia đôi"}
    </button>
  );
}

/**
 * The "taskbar" of open tabs (user's own term) - a Chrome-style strip, not the Sidebar. Each tab
 * is its own independent page kept alive in the DOM by TabContentRenderer; clicking one just
 * switches which is visible, never a real navigation/reload. "+" always opens a fresh tab to
 * Home, per the user's explicit spec ("mỗi lần thêm tab sẽ mở ra một cửa sổ home").
 *
 * In split-screen the bar splits too: each half sits exactly above its pane and shows that pane's
 * tab first, then the tabs that are open in the background (picking one swaps it into THIS pane);
 * "+" opens a new Home tab in that pane, and the split toggle stays at the far right.
 */
export function TabBar() {
  const { tabs, activeTabId, splitTabId, panes, selectTab, selectTabInPane, openNewTabInPane, closeTab, openNewTab, toggleSplit } =
    useTabs();
  const barClassName = "flex items-stretch border-b border-gray-200 bg-surface-muted";

  if (!panes) {
    return (
      <div className={`${barClassName} gap-1 overflow-x-auto px-2 pt-2`}>
        {tabs.map((tab) => (
          <TabChip
            key={tab.id}
            tab={tab}
            state={tab.id === activeTabId ? "focused" : "idle"}
            canClose={tabs.length > 1}
            onSelect={() => selectTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}
        <NewTabButton onClick={openNewTab} />
        <SplitToggle split={false} onClick={toggleSplit} />
      </div>
    );
  }

  const backgroundTabs = tabs.filter((t) => t.id !== panes.leftId && t.id !== panes.rightId);
  const paneIds = [panes.leftId, panes.rightId];

  return (
    <div className={barClassName}>
      {paneIds.map((paneId, index) => {
        const ownTab = tabs.find((t) => t.id === paneId);
        if (!ownTab) return null;
        const isFocused = paneId === activeTabId;
        const isRight = index === 1;
        return (
          <div
            key={paneId}
            // Below md only the focused pane is shown, so only its strip is too.
            className={`min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 pt-2 md:basis-1/2 ${isFocused ? "flex" : "hidden md:flex"} ${
              isRight ? "" : "md:border-r md:border-gray-200"
            }`}
          >
            <TabChip
              tab={ownTab}
              state={isFocused ? "focused" : "partner"}
              canClose
              onSelect={() => selectTab(paneId)}
              onClose={() => closeTab(paneId)}
            />
            {backgroundTabs.map((tab) => (
              <TabChip
                key={tab.id}
                tab={tab}
                state="idle"
                canClose
                onSelect={() => selectTabInPane(paneId, tab.id)}
                onClose={() => closeTab(tab.id)}
              />
            ))}
            <NewTabButton onClick={() => openNewTabInPane(paneId)} />
            {isRight && splitTabId && <SplitToggle split onClick={toggleSplit} />}
          </div>
        );
      })}
    </div>
  );
}
