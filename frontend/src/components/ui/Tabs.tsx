"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { nextTabId } from "@/lib/tabsNav";

export interface TabItem<Id extends string> {
  id: Id;
  label: ReactNode;
  disabled?: boolean;
  /** Tooltip, e.g. why the tab is disabled. */
  title?: string;
}

type TabsVariant = "underline" | "segmented" | "solid" | "side";

interface TabsProps<Id extends string> {
  items: TabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Accessible name of the tab list. */
  label: string;
  variant?: TabsVariant;
  className?: string;
  /** From `useTabsIds()` in the component that renders the panels, so each panel can point back at its tab. */
  ids?: TabsIds;
}

const BASE = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-colors duration-150";

const LIST_CLASSES: Record<TabsVariant, string> = {
  underline: "flex gap-1 overflow-x-auto border-b border-line",
  segmented: "flex gap-1",
  solid: "flex w-full gap-1",
  side: "flex shrink-0 gap-1 overflow-x-auto md:w-44 md:flex-col md:overflow-visible",
};

const TAB_CLASSES: Record<TabsVariant, { on: string; off: string }> = {
  underline: {
    on: "shrink-0 border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary-text",
    off: "shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40",
  },
  segmented: {
    on: "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium bg-surface-muted text-fg",
    off: "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-muted",
  },
  solid: {
    on: "flex-1 rounded px-1 py-1 text-xs font-medium bg-primary text-primary-foreground",
    off: "flex-1 rounded px-1 py-1 text-xs font-medium bg-surface-muted text-fg-soft hover:text-fg",
  },
  side: {
    on: "whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium bg-primary/10 text-primary-text",
    off: "whitespace-nowrap rounded px-3 py-2 text-left text-sm font-medium text-fg-soft hover:bg-surface-muted hover:text-fg",
  },
};

export interface TabsIds {
  tabId: (id: string) => string;
  panelId: (id: string) => string;
}

/** The id a TabPanel needs so the panel and its tab point at each other (ARIA: aria-controls / aria-labelledby). */
export function useTabsIds(): TabsIds {
  const base = useId().replace(/:/g, "");
  return {
    tabId: (id: string) => `${base}-tab-${id}`,
    panelId: (id: string) => `${base}-panel-${id}`,
  };
}

/**
 * Design-system primitive (CLAUDE.md section 26): one row (or column, for `side`) of tabs with the keyboard
 * behaviour screen-reader and keyboard users expect - arrow keys move between tabs (skipping disabled ones),
 * Home/End jump to the ends, and only the selected tab is in the Tab order.
 */
export function Tabs<Id extends string>({ items, value, onChange, label, variant = "underline", className = "", ids }: TabsProps<Id>) {
  const ownIds = useTabsIds();
  const { tabId, panelId } = ids ?? ownIds;
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = nextTabId(items, value, event.key);
    if (target === null) return;
    event.preventDefault();
    onChange(target as Id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${target}"]`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation={variant === "side" ? "vertical" : "horizontal"}
      onKeyDown={handleKeyDown}
      className={`${LIST_CLASSES[variant]} ${className}`}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={tabId(item.id)}
            data-tab-id={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={ids ? panelId(item.id) : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            title={item.title}
            onClick={() => onChange(item.id)}
            className={`${BASE} ${selected ? TAB_CLASSES[variant].on : TAB_CLASSES[variant].off}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
