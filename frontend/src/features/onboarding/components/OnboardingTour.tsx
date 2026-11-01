"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/features/auth/types";
import { useCompleteOnboarding } from "../hooks/useOnboarding";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { computeTourLayout, SPOTLIGHT_PADDING, type Rect } from "../tourLayout";
import { tourStepsFor, type TourStep } from "../tourSteps";

import { useI18n } from "@/lib/i18n/useI18n";
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

const AUTO_START_DELAY_MS = 700;
const GLIDE_SECONDS = 0.45;

/** The visible element a step points at, or null (missing, hidden, collapsed menu, other screen size...). */
function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`));
  const visible = candidates.find(element => element.getClientRects().length > 0);
  if (visible) return visible;
  // A destination can be inside a closed navigation group; point at its disclosure first.
  if (step.target.startsWith("nav:")) {
    for (const element of candidates) {
      const toggle = element.closest("[data-nav-group]")?.querySelector<HTMLElement>("[data-nav-toggle]");
      if (toggle && toggle.getClientRects().length > 0) return toggle;
    }
    const menu = document.querySelector<HTMLElement>(".app-menu-trigger");
    if (menu && menu.getClientRects().length > 0) return menu;
  }
  return null;
}

function TourOverlay({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  // The measured target, tagged with the step it was measured for so a render right after a step change never uses the last step's box.
  const [measured, setMeasured] = useState<{ index: number; rect: Rect | null } | null>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const placedStepRef = useRef<number | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = steps[index] as TourStep;
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step);
    if (!el) {
      setMeasured({ index, rect: null });
      return;
    }
    const box = el.getBoundingClientRect();
    setMeasured({ index, rect: { top: box.top, left: box.left, width: box.width, height: box.height } });
  }, [step, index]);

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
  }, [step, measured]);

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

  const measuredForThisStep = measured?.index === index;
  const rect = measuredForThisStep ? measured.rect : null;
  const layout = computeTourLayout(rect, cardHeight, { width: window.innerWidth, height: window.innerHeight });

  // The lit frame and the card glide from one step to the next (GSAP); between steps (scrolling, resizing) they
  // simply follow. Under reduced motion they jump. React never sets their position, so the two cannot fight.
  useGSAP(
    () => {
      const spotlight = spotlightRef.current;
      const card = cardRef.current;
      if (!spotlight || !card || !measuredForThisStep) return;
      const target = layout.spotlight;
      const spotlightProps = target ?? { top: 0, left: 0, width: 0, height: 0 };
      const firstPlacement = placedStepRef.current === null;
      const stepChanged = placedStepRef.current !== index;
      placedStepRef.current = index;

      if (prefersReducedMotion()) {
        gsap.set(spotlight, { ...spotlightProps, opacity: target ? 1 : 0 });
        gsap.set(card, layout.card);
        return;
      }
      if (firstPlacement) {
        gsap.set(spotlight, { ...spotlightProps, opacity: target ? 1 : 0 });
        gsap.set(card, layout.card);
        gsap.from(card, { opacity: 0, y: 12, duration: 0.35, ease: "power2.out" });
        return;
      }
      if (!stepChanged) {
        // Scrolling or resizing within a step: just follow the target.
        gsap.killTweensOf([spotlight, card]);
        gsap.set(spotlight, { ...spotlightProps, opacity: target ? 1 : 0 });
        gsap.set(card, layout.card);
        return;
      }
      gsap.to(spotlight, { ...spotlightProps, opacity: target ? 1 : 0, duration: GLIDE_SECONDS, ease: "power3.inOut", overwrite: "auto" });
      gsap.to(card, { ...layout.card, duration: GLIDE_SECONDS, ease: "power3.inOut", overwrite: "auto" });
      gsap.fromTo(card.querySelectorAll("[data-tour-text]"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 0.1 });
    },
    {
      dependencies: [
        index,
        layout.spotlight?.top,
        layout.spotlight?.left,
        layout.spotlight?.width,
        layout.spotlight?.height,
        layout.card.top,
        layout.card.left,
        layout.card.width,
      ],
    },
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Blocks interaction with the app behind the tour; the dim comes from the spotlight's shadow. */}
      <div className={`absolute inset-0 ${rect ? "" : "bg-black/55"}`} aria-hidden />
      <div
        ref={spotlightRef}
        aria-hidden
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary"
        style={{ boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)", opacity: 0 }}
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="absolute flex flex-col gap-3 rounded-lg glass p-4"
      >
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <span>
            {t("onboarding.onboardingTour.stepOf", { current: index + 1, total: steps.length })}
          </span>
          {!isLast && (
            <button type="button" onClick={onFinish} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              {t("onboarding.onboardingTour.skip")}
            </button>
          )}
        </div>
        <h3 id="tour-title" data-tour-text className="text-base font-semibold text-fg">
          {t(step.titleKey)}
        </h3>
        <p data-tour-text className="text-sm text-fg-soft">
          {t(step.bodyKey)}
        </p>
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={back} disabled={index === 0}>
            {t("onboarding.onboardingTour.back")}
          </Button>
          <button
            ref={primaryRef}
            type="button"
            onClick={next}
            className="glass-button rounded bg-gradient-to-r from-primary to-primaryEnd px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isLast ? t("common.done2") : t("onboarding.onboardingTour.next")}
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
