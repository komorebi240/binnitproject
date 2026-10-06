"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { OrbitIntroLogo } from "./OrbitIntroLogo";

/**
 * True once the intro has run (or been skipped) in this page load. A module variable, not storage:
 * a fresh visit or reload ("just arrived on the site") plays it, but coming back to the login page by
 * in-app navigation (e.g. after signing out) does not make people sit through it again.
 */
let introShownThisPageLoad = false;

// useLayoutEffect warns during server rendering; the effect is client-only anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Phase = "pending" | "playing" | "done";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Reveal({
  revealed,
  animated,
  delayMs,
  className = "",
  children,
}: {
  revealed: boolean;
  animated: boolean;
  delayMs: number;
  className?: string;
  children: React.ReactNode;
}) {
  // `invisible` keeps the space (nothing shifts when it appears) and takes it out of tab order.
  const state = !revealed ? "invisible" : animated ? "animate-rise-in" : "";
  return (
    <div
      className={`${state} ${className}`}
      style={animated && revealed ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * The login page's opening: the ORBIT logo animates first (letters orbit the planet, then form the
 * word beside it), and only then do the heading and the sign-in form appear. Plays once per page load,
 * is skipped for people who prefer reduced motion, and any key press or click jumps to the end.
 */
export function LoginIntro({
  heading,
  children,
}: {
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("pending");
  const [animated, setAnimated] = useState(true);

  // Decided before the first paint on the client; the server always renders the intro's opening frame.
  useIsomorphicLayoutEffect(() => {
    if (introShownThisPageLoad || prefersReducedMotion()) {
      introShownThisPageLoad = true;
      setAnimated(false);
      setPhase("done");
      return;
    }
    setPhase("playing");
  }, []);

  const handleComplete = useCallback(() => {
    introShownThisPageLoad = true;
    setPhase("done");
  }, []);

  // After the intro, put the cursor where people type; without the intro the page behaves as it always did.
  useEffect(() => {
    if (phase === "done" && animated) {
      document.querySelector<HTMLInputElement>('input[autocomplete="username"]')?.focus();
    }
  }, [phase, animated]);

  const revealed = phase === "done";

  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        {animated ? (
          <OrbitIntroLogo width={182} height={64} onComplete={handleComplete} />
        ) : (
          <OrbitWordmark width={182} height={64} />
        )}
        <Reveal revealed={revealed} animated={animated} delayMs={0}>
          {heading}
        </Reveal>
      </div>
      <Reveal
        revealed={revealed}
        animated={animated}
        delayMs={140}
        className="flex w-full flex-col items-center"
      >
        {children}
      </Reveal>
    </>
  );
}
