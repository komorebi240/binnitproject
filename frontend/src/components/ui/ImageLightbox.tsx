"use client";

import { useEffect } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import { PaneOverlay, useOwnsKeyboard } from "@/components/layout/PaneContext";

import { useI18n } from "@/lib/i18n/useI18n";
interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  /** When given, a download button saves the image under `downloadName`. */
  downloadHref?: string;
  downloadName?: string;
}

const ROUND_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

/**
 * Shows one image large over a heavily dimmed page, with no frame around it; Esc or a click outside closes it. With the
 * screen split it stays inside the pane that opened it (PaneOverlay).
 */
export function ImageLightbox({ src, alt, onClose, downloadHref, downloadName }: ImageLightboxProps) {
  const { t } = useI18n();
  const ownsKeyboard = useOwnsKeyboard();
  useEffect(() => {
    if (!ownsKeyboard) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, ownsKeyboard]);

  return (
    <PaneOverlay role="dialog" aria-modal="true" aria-label={alt} className="z-50 flex items-center justify-center p-4">
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="animate-fade-in absolute inset-0 cursor-default bg-black/80" />
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: or API URL, next/image can't optimize it */}
      <img src={src} alt={alt} className="animate-pop-in relative max-h-full max-w-full object-contain" />
      <div className="absolute right-4 top-4 flex gap-2">
        {downloadHref && (
          <a href={downloadHref} download={downloadName} aria-label={t("ui.imageLightbox.downloadImage")} title={t("ui.imageLightbox.downloadImage")} className={ROUND_BUTTON}>
            <DownloadSimple size={18} weight="bold" aria-hidden />
          </a>
        )}
        <button type="button" onClick={onClose} aria-label={t("ui.imageLightbox.closeImage")} className={ROUND_BUTTON}>
          <X size={18} weight="bold" aria-hidden />
        </button>
      </div>
    </PaneOverlay>
  );
}
