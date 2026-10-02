"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { NAV_ITEMS } from "./Sidebar";
import { useTabs } from "./TabsContext";
import type { AuthorityLevel } from "@/features/auth/types";

interface QuickSearchProps {
  currentUserAuthorityLevel: AuthorityLevel;
}

/**
 * A command-palette-style quick search over the app's own nav destinations (Ctrl/Cmd+K, or the
 * header's magnifying-glass icon) - searches the same `NAV_ITEMS` the Sidebar renders, so it's
 * never out of sync with what's actually navigable. Filtered to whatever roles the Sidebar
 * itself would show (CLAUDE.md section 9 - UX-only mirror, not a new authorization decision).
 */
export function QuickSearch({ currentUserAuthorityLevel }: QuickSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateActiveTab } = useTabs();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(currentUserAuthorityLevel));
  const results = query.trim()
    ? visibleItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : visibleItems;

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
        title="Tìm kiếm nhanh (Ctrl+K)"
        aria-label="Tìm kiếm nhanh"
        data-tour="search"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <MagnifyingGlass size={20} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 pt-24">
          <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="animate-fade-in fixed inset-0 cursor-default bg-black/20" />
          <div className="animate-pop-in relative w-full max-w-md origin-top rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
              <MagnifyingGlass size={18} className="text-gray-400" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Tìm tính năng, trang..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">Esc</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-gray-400">Không tìm thấy</li>
              ) : (
                results.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => go(item.href)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                          index === activeIndex ? "bg-surface-muted text-gray-900" : "text-gray-700"
                        }`}
                      >
                        <ItemIcon size={16} aria-hidden className="shrink-0 text-gray-400" />
                        {item.label}
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
