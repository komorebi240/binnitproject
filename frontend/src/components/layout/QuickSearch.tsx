"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Highlight } from "@/components/ui/Highlight";
import { searchFeatures } from "./featureSearch";
import { useTabs } from "./TabsContext";
import type { AuthorityLevel } from "@/features/auth/types";

import { useI18n } from "@/lib/i18n/useI18n";
interface QuickSearchProps {
  currentUserAuthorityLevel: AuthorityLevel;
}

/**
 * A command-palette-style quick search over the app's pages AND the smaller features inside them
 * (Ctrl/Cmd+K, or the header's magnifying-glass icon). A matching small feature is listed under its
 * parent page, and the typed words are highlighted. Pages come from the Sidebar's `NAV_ITEMS`, so the
 * list never drifts from what is navigable; it is filtered by role like the Sidebar (CLAUDE.md section 9 -
 * a UX mirror, not an authorization decision).
 */
export function QuickSearch({ currentUserAuthorityLevel }: QuickSearchProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateActiveTab } = useTabs();

  const groups = searchFeatures(query, currentUserAuthorityLevel, t);
  // One flat list so arrow keys walk pages and their sub-features in the order they are drawn.
  const results = groups.flatMap((group) => [
    { key: group.entry.href, href: group.entry.href, label: t(group.entry.labelKey), icon: group.entry.icon, child: false },
    ...group.children.map((child) => ({
      key: `${group.entry.href}#${child.labelKey}`,
      href: group.entry.href,
      label: t(child.labelKey),
      icon: group.entry.icon,
      child: true,
    })),
  ]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Wait for the dialog to actually mount before focusing it.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function go(href: string) {
    setOpen(false);
    navigateActiveTab(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      go(results[activeIndex].href);
    }
  }

  return (
    <>
      <button
        type="button"
        title={t("layout.quickSearch.quickSearchCtrlK")}
        aria-label={t("common.quickSearch")}
        data-tour="search"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <MagnifyingGlass size={20} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 pt-24">
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)} className="animate-fade-in fixed inset-0 cursor-default bg-black/20" />
          <div className="animate-pop-in relative glass-window w-full max-w-md origin-top rounded-lg">
            <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2.5">
              <MagnifyingGlass size={18} className="text-fg-faint" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("layout.quickSearch.searchFeaturesPages")}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-faint">Esc</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-fg-faint">{t("layout.quickSearch.noResults")}</li>
              ) : (
                results.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => go(item.href)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center gap-2.5 py-2 pr-3 text-left text-sm ${item.child ? "pl-9" : "pl-3"} ${
                          index === activeIndex ? "bg-surface-muted text-fg" : "text-fg-soft"
                        }`}
                      >
                        {item.child ? (
                          <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                        ) : (
                          <ItemIcon size={16} aria-hidden className="shrink-0 text-fg-faint" />
                        )}
                        <span className={item.child ? "text-fg-soft" : "font-medium"}>
                          <Highlight text={item.label} query={query} />
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
