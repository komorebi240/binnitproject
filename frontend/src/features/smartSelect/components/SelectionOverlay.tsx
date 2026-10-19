"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { IGNORE_ATTRIBUTE, boxFromPoints, type Box } from "../textCapture";

/** A drag smaller than this (in pixels, both ways) is a stray click, not a selection. */
const MIN_SELECTION_PX = 8;

interface SelectionOverlayProps {
  /** Called once the overlay no longer covers the page, so the text under it can be read. */
  onSelect: (area: Box) => void;
  onCancel: () => void;
}

/**
 * Dims the screen and lets the user drag a rectangle over the text they want, like the Windows snipping tool. Esc leaves.
 * When the drag ends, the overlay stops taking part in hit-testing for one frame before reporting the area, so the
 * capture sees the page and not the overlay.
 */
export function SelectionOverlay({ onSelect, onCancel }: SelectionOverlayProps) {
  const { t } = useI18n();
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [area, setArea] = useState<Box | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function finish() {
    const selected = area;
    setOrigin(null);
    if (!selected || selected.right - selected.left < MIN_SELECTION_PX || selected.bottom - selected.top < MIN_SELECTION_PX) {
      setArea(null);
      return;
    }
    setCapturing(true);
    requestAnimationFrame(() => onSelect(selected));
  }

  return (
    <div
      {...{ [IGNORE_ATTRIBUTE]: "" }}
      role="dialog"
      aria-modal="true"
      aria-label={t("smartSelect.overlay.label")}
      style={{ pointerEvents: capturing ? "none" : "auto" }}
      className={`fixed inset-0 z-[60] cursor-crosshair touch-none select-none ${area ? "" : "bg-black/35"}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setOrigin({ x: event.clientX, y: event.clientY });
        setArea(null);
      }}
      onPointerMove={(event) => {
        if (origin) setArea(boxFromPoints(origin, { x: event.clientX, y: event.clientY }));
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        setOrigin(null);
        setArea(null);
      }}
    >
      {!area && (
        <p className="glass pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded px-4 py-2 text-sm text-fg shadow">
          {t("smartSelect.overlay.hint")}
        </p>
      )}
      {area && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-sm border-2 border-primary"
          style={{
            left: area.left,
            top: area.top,
            width: area.right - area.left,
            height: area.bottom - area.top,
            // Everything outside the selection stays dimmed.
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.35)",
          }}
        />
      )}
    </div>
  );
}
