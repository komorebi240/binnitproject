"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** The tab pane a piece of the interface lives in (see TabContentRenderer's TabPane). */
export interface PaneInfo {
  element: HTMLElement | null;
  /** The screen is split in two. */
  split: boolean;
  /** This pane is the one the sidebar, search and keyboard act on. */
  focused: boolean;
  /** The pane's tab is on screen (a background tab is kept mounted but hidden). */
  visible: boolean;
}

export const PaneContext = createContext<PaneInfo | null>(null);

/** Null outside the tab panes (the header, the sidebar, app-wide windows). */
export function usePane(): PaneInfo | null {
  return useContext(PaneContext);
}

/** Where the pane is on screen while the screen is split; undefined otherwise. */
function usePaneRect(pane: PaneInfo | null): React.CSSProperties | undefined {
  const element = pane?.split && pane.visible ? pane.element : null;
  const [rect, setRect] = useState<React.CSSProperties | undefined>(undefined);
  useEffect(() => {
    if (!element) {
      setRect(undefined);
      return undefined;
    }
    const measure = () => {
      const box = element.getBoundingClientRect();
      setRect({ left: box.left, top: box.top, width: box.width, height: box.height });
    };
    measure();
    // The divider, the sidebar collapsing and the window all change the pane's size.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [element]);
  return element ? rect : undefined;
}

/**
 * A dimmed layer for a window opened from a page (Modal, ImageLightbox). With the screen split it covers only the pane
 * that opened it, so the other half stays usable; otherwise the whole window, as before. It is rendered at the end of
 * the document (a portal) so no styled ancestor can clip or re-anchor it, yet it stays part of its page in React: a
 * click in it still focuses its pane, and it is hidden - not unmounted, so nothing typed is lost - while its tab is in
 * the background.
 */
export function PaneOverlay({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const pane = usePane();
  const rect = usePaneRect(pane);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;
  const hidden = pane !== null && !pane.visible;
  return createPortal(
    <div
      {...props}
      style={rect}
      className={`fixed ${rect ? "" : "inset-0"} ${hidden ? "hidden" : ""} ${className ?? ""}`}
    >
      {children}
    </div>,
    host,
  );
}

/** Whether a window of this pane should answer Escape: its tab is on screen and, when split, its pane is focused. */
export function useOwnsKeyboard(): boolean {
  const pane = usePane();
  return pane === null || (pane.visible && (!pane.split || pane.focused));
}
