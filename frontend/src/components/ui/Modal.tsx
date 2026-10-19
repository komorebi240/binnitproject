"use client";

import { useCallback, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { PaneOverlay, useOwnsKeyboard } from "@/components/layout/PaneContext";

import { useI18n } from "@/lib/i18n/useI18n";
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-width class for the dialog panel. */
  widthClassName?: string;
}

/**
 * Dimmed overlay + centered dialog; closes on Escape or an overlay click. With the screen split, the dialog and its dim
 * stay inside the pane that opened it (PaneOverlay), and Escape closes only the focused pane's dialog.
 *
 * The dialog takes the keyboard focus when it opens (unless a field in it already did, with autoFocus) and hands it back
 * to what had it when it closes. Besides being what a dialog should do, this keeps Escape working when the dialog was
 * opened from inside a whiteboard: Excalidraw stops every Escape pressed while the focus is within it.
 */
export function Modal({ title, onClose, children, widthClassName = "max-w-lg" }: ModalProps) {
  const { t } = useI18n();
  const ownsKeyboard = useOwnsKeyboard();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // A callback ref: the panel is rendered a moment after the Modal itself (PaneOverlay waits for the document).
  const takeFocus = useCallback((panel: HTMLDivElement | null) => {
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!ownsKeyboard) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, ownsKeyboard]);

  return (
    <PaneOverlay className="z-40 flex items-center justify-center p-4">
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="absolute inset-0 cursor-default bg-black/45" />
      <div
        ref={takeFocus}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`glass-window animate-fade-in relative flex max-h-full w-full flex-col gap-4 overflow-y-auto rounded-lg p-6 focus:outline-none ${widthClassName}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </PaneOverlay>
  );
}
