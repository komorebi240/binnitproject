"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/** Shows one image large over a heavily dimmed page, with no frame around it; Esc or a click outside closes it. */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Đóng" onClick={onClose} className="animate-fade-in absolute inset-0 cursor-default bg-black/80" />
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image can't optimize it */}
      <img src={src} alt={alt} className="animate-pop-in relative max-h-[90vh] max-w-[90vw] object-contain" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng ảnh"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <X size={18} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
