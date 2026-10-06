"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { AuthCard } from "./AuthCard";

interface AuthWindowProps {
  /** Accessible name of the window, e.g. "Đăng nhập". */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A sign-in window floating over the landing page: dimmed backdrop, the card pops in, Esc / the close button / a click
 * on the backdrop close it, Tab stays inside it, the page behind does not scroll, and the focus goes back to the
 * button that opened it. Under reduced motion it simply appears and disappears.
 */
export function AuthWindow({ label, onClose, children }: AuthWindowProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  // The element that had the focus when the window opened (read while rendering, before the window moves the focus
  // into itself - in development React runs effects twice, which would otherwise capture the window's own field).
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null,
  );

  useGSAP(
    () => {
      if (!prefersReducedMotion()) {
        gsap.from(scrimRef.current, { opacity: 0, duration: 0.25, clearProps: "opacity" });
        gsap.from(cardRef.current, {
          opacity: 0,
          y: 28,
          scale: 0.96,
          duration: 0.45,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      }
      // Not on a touch screen, where focusing a field would pop the keyboard up over the form.
      if (window.matchMedia("(pointer: fine)").matches) {
        cardRef.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
      }
    },
    { scope: overlayRef },
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const finish = () => {
      onClose();
      opener?.focus();
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    gsap
      .timeline({ onComplete: finish })
      .to(cardRef.current, { opacity: 0, y: 20, scale: 0.97, duration: 0.25, ease: "power2.in" })
      .to(scrimRef.current, { opacity: 0, duration: 0.2 }, "<");
  }, [onClose, opener]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  // Keep Tab / Shift+Tab inside the window.
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    ).filter((el) => el.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 overflow-y-auto"
      onMouseDown={(event) => {
        if (!cardRef.current?.contains(event.target as Node)) requestClose();
      }}
    >
      {/* A layer of its own beneath the card, not the card's parent: the card's glass can only blur what is painted
          before it inside the same layer stack, and a blurred parent would hide the page from it. */}
      <div ref={scrimRef} aria-hidden className="fixed inset-0 bg-black/45 will-change-[opacity]" />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onKeyDown={trapFocus}
          className="relative w-full max-w-md will-change-[transform,opacity]"
        >
          <AuthCard>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Đóng"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X size={18} aria-hidden />
            </button>
            {children}
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
