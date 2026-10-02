"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DotsThreeVertical } from "@phosphor-icons/react";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible name of the trigger, e.g. "Tuỳ chọn nhân sự". */
  label?: string;
  size?: "sm" | "md";
}

const MENU_WIDTH = 176;
const EDGE_MARGIN = 8;
const TRIGGER_GAP = 4;

/**
 * "..." menu rendered in a portal with `position: fixed`, so it is never clipped by a scrolling
 * table container or pushed below the fold: it opens downward when there is room and flips upward
 * otherwise (the bug on the last rows of a long table). Closes on Escape, outside click, scroll
 * and resize; focus moves into the menu and returns to the trigger.
 */
export function ActionMenu({ items, label = "Tuỳ chọn", size = "md" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
    triggerRef.current?.focus();
  }, []);

  // Measure after the menu is in the DOM so its real height decides whether to flip.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - trigger.bottom - EDGE_MARGIN;
    const top =
      spaceBelow >= menuHeight || trigger.top < menuHeight + EDGE_MARGIN
        ? trigger.bottom + TRIGGER_GAP
        : trigger.top - menuHeight - TRIGGER_GAP;
    const left = Math.min(Math.max(EDGE_MARGIN, trigger.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - EDGE_MARGIN);
    setPosition({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      if (buttons.length === 0) return;
      event.preventDefault();
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex = event.key === "ArrowDown" ? (current + 1) % buttons.length : (current - 1 + buttons.length) % buttons.length;
      buttons[nextIndex]?.focus();
    }
    function handleDismiss() {
      setOpen(false);
      setPosition(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
    };
  }, [open, close]);

  const triggerSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center justify-center rounded text-gray-400 transition-colors duration-150 hover:bg-surface-muted hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${triggerSize}`}
      >
        <DotsThreeVertical size={size === "sm" ? 16 : 18} weight="bold" aria-hidden />
      </button>

      {open &&
        createPortal(
          <>
            <button type="button" aria-label="Đóng menu" onClick={close} className="fixed inset-0 z-40 cursor-default" />
            <div
              ref={menuRef}
              role="menu"
              className="animate-fade-in fixed z-50 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg"
              style={{
                width: MENU_WIDTH,
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                  className={`block w-full px-3 py-1.5 text-left hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none disabled:opacity-50 ${item.danger ? "text-danger" : "text-gray-700"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
