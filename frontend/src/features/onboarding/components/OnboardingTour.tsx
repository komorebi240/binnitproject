"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/features/auth/types";
import { useCompleteOnboarding } from "../hooks/useOnboarding";
import { tourStepsFor, type TourStep } from "../tourSteps";

interface TourContextValue {
  /** Runs the tour again (e.g. from Cài đặt); never changes the saved "completed" flag. */
  startTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

const SPOTLIGHT_PADDING = 6;
const CARD_WIDTH = 320;
const VIEWPORT_MARGIN = 12;
const AUTO_START_DELAY_MS = 700;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The visible element a step points at, or null (missing, hidden, collapsed menu, other screen size...). */
function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el || el.getClientRects().length === 0) return null;
  return el;
}

function TourOverlay({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = steps[index] as TourStep;
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step);
    if (!el) {
      setRect(null);
      return;
    }
    const box = el.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step]);

  // Bring the target into view first, then measure; re-measure whenever the layout can change.
  useLayoutEffect(() => {
    findTarget(step)?.scrollIntoView({ block: "nearest", inline: "center" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [step, rect]);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [index]);

  const next = useCallback(() => (isLast ? onFinish() : setIndex((i) => i + 1)), [isLast, onFinish]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onFinish();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, back, onFinish]);

  // Card placement: below the target if it fits, otherwise above; centered when there is no target.
  const cardStyle: React.CSSProperties = (() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(CARD_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
    if (!rect) {
      return { width, top: Math.max(VIEWPORT_MARGIN, (viewportHeight - cardHeight) / 2), left: (viewportWidth - width) / 2 };
    }
    const below = rect.top + rect.height + SPOTLIGHT_PADDING + 10;
    const fitsBelow = below + cardHeight + VIEWPORT_MARGIN <= viewportHeight;
    const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rect.top - SPOTLIGHT_PADDING - 10 - cardHeight);
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, centered), viewportWidth - width - VIEWPORT_MARGIN);
    return { width, top, left };
  })();

  return (
    <div className="fixed inset-0 z-50">
      {/* Blocks interaction with the app behind the tour; the dim comes from the spotlight's shadow. */}
      <div className={`absolute inset-0 ${rect ? "" : "bg-black/55"}`} aria-hidden />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="absolute flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        style={cardStyle}
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Bước {index + 1}/{steps.length}
          </span>
          {!isLast && (
            <button type="button" onClick={onFinish} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              Bỏ qua
            </button>
          )}
        </div>
        <h3 id="tour-title" className="text-base font-semibold text-gray-900">
          {step.title}
        </h3>
        <p className="text-sm text-gray-600">{step.body}</p>
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={back} disabled={index === 0}>
            Quay lại
          </Button>
          <button
            ref={primaryRef}
            type="button"
            onClick={next}
            className="gradient-surface rounded bg-gradient-to-r from-primary to-primaryEnd px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isLast ? "Hoàn tất" : "Tiếp theo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Starts the guided tour automatically the first time a user lands in the app (the server says
 * `onboardingCompleted` is false) and lets Cài đặt replay it. Finishing or skipping saves the flag
 * so it never auto-starts again; replaying does not touch the flag.
 */
export function TourProvider({ currentUser, children }: { currentUser: UserProfile; children: React.ReactNode }) {
  const [running, setRunning] = useState(false);
  const completeOnboarding = useCompleteOnboarding();
  const steps = useMemo(() => tourStepsFor(currentUser.authorityLevel), [currentUser.authorityLevel]);

  useEffect(() => {
    if (currentUser.onboardingCompleted) return;
    const timer = window.setTimeout(() => setRunning(true), AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentUser.onboardingCompleted]);

  const finish = useCallback(() => {
    setRunning(false);
    if (!currentUser.onboardingCompleted) {
      completeOnboarding.mutate();
    }
  }, [currentUser.onboardingCompleted, completeOnboarding]);

  const startTour = useCallback(() => setRunning(true), []);
  const value = useMemo(() => ({ startTour }), [startTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {running && <TourOverlay steps={steps} onFinish={finish} />}
    </TourContext.Provider>
  );
}
