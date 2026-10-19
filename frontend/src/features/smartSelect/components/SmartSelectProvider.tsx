"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { IGNORE_ATTRIBUTE, MAX_CAPTURE_LENGTH, captureText, type Box } from "../textCapture";
import { SelectionOverlay } from "./SelectionOverlay";
import { SmartSelectPanel } from "./SmartSelectPanel";

interface SmartSelectContextValue {
  /** Starts a selection (the header button and Alt+S). */
  start: () => void;
}

const SmartSelectContext = createContext<SmartSelectContextValue | null>(null);

export function useSmartSelect(): SmartSelectContextValue {
  const value = useContext(SmartSelectContext);
  if (!value) throw new Error("useSmartSelect must be used inside SmartSelectProvider");
  return value;
}

/** Alt+S: two keys, as asked, and not taken by the browser or by the whiteboard. */
function isShortcut(event: KeyboardEvent): boolean {
  return (
    event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyS"
  );
}

/** Text the user already highlighted (keyboard users select text the usual way), with where it is on screen. */
function highlightedText(): { text: string; area: Box } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const anchor =
    selection.anchorNode instanceof Element
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
  if (anchor?.closest(`[${IGNORE_ATTRIBUTE}]`)) return null;
  const text = selection.toString().trim().slice(0, MAX_CAPTURE_LENGTH);
  if (!text) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return { text, area: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
}

/**
 * Smart select, available on every dashboard page: Alt+S (or the header button) dims the screen, the user drags over the
 * text they want, and a small panel offers to copy it, analyse it, or put it on a whiteboard. Text already highlighted
 * is used straight away, without the overlay. Everything happens in the browser; the text leaves it only when the user
 * saves it somewhere (a task, an event, a board).
 */
export function SmartSelectProvider({
  currentUser,
  children,
}: {
  currentUser: UserProfile;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [selecting, setSelecting] = useState(false);
  const [result, setResult] = useState<{ text: string; area: Box } | null>(null);

  const start = useCallback(() => {
    const highlighted = highlightedText();
    if (highlighted) {
      setResult(highlighted);
      return;
    }
    setResult(null);
    setSelecting(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isShortcut(event) || event.repeat) return;
      // Ours on every page: the whiteboard canvas would otherwise take the key while it has focus.
      event.preventDefault();
      event.stopPropagation();
      start();
    }
    // Capture phase, so the shortcut is seen before any focused widget handles it.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [start]);

  const handleSelect = useCallback(
    (area: Box) => {
      setSelecting(false);
      const text = captureText(area).trim();
      if (!text) {
        showToast("error", t("smartSelect.overlay.nothingFound"));
        return;
      }
      setResult({ text, area });
    },
    [showToast, t],
  );

  const cancel = useCallback(() => setSelecting(false), []);

  return (
    <SmartSelectContext.Provider value={{ start }}>
      {children}
      {selecting && <SelectionOverlay onSelect={handleSelect} onCancel={cancel} />}
      {result && (
        <SmartSelectPanel
          // A new capture starts from its own text, not the previous one's edits.
          key={`${result.area.left},${result.area.top},${result.text.length}`}
          text={result.text}
          area={result.area}
          currentUser={currentUser}
          onClose={() => setResult(null)}
        />
      )}
    </SmartSelectContext.Provider>
  );
}
