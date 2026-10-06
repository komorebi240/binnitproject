"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-width class for the dialog panel. */
  widthClassName?: string;
}

/** Dimmed overlay + centered dialog; closes on Escape or an overlay click. */
export function Modal({ title, onClose, children, widthClassName = "max-w-lg" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // A dialog left open in a background tab stays mounted (hidden); Esc pressed in the visible tab must not close it.
      const hiddenInBackgroundTab = panelRef.current?.getClientRects().length === 0;
      if (event.key === "Escape" && !hiddenInBackgroundTab) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-window animate-fade-in relative flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-lg p-6 ${widthClassName}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-surface-muted hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
