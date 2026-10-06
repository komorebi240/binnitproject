"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, CursorClick } from "@phosphor-icons/react";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { Tagline } from "@/components/brand/Tagline";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { centerOffset, type AuthView } from "../authView";
import { hasIntroPlayed, markIntroPlayed } from "../introState";
import { haloScale } from "../orbitHalo";
import { DottedBackdrop, HELD_BACK, OrbitHalo } from "./LandingDecor";
import { useRevealOnInput } from "../useRevealOnInput";
import { OrbitIntroLogo } from "./OrbitIntroLogo";

/**
 * The sign-in and registration windows (forms, registration wizard) are not needed to show the logo and the two
 * buttons, so their code is a separate chunk, fetched shortly after the landing has settled (see below) or on demand.
 */
const loadAuthWindows = () => import("./AuthWindows").then((module) => module.AuthWindows);
const AuthWindows = dynamic(loadAuthWindows, { ssr: false });

// useLayoutEffect warns during server rendering; the effect is client-only anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Phase = "pending" | "playing" | "ready";

/** How big the logo is while it plays in the middle of the screen, before it settles at its normal size. */
const INTRO_SCALE = 1.6;
const LOGO_WIDTH = 260;

const BUTTON_BASE =
  "group inline-flex min-w-[11.5rem] flex-1 items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold tracking-wide transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

/**
 * The two things a visitor can do here. Each is a plain text label; the primary one also gets an arrow that slides out.
 * The timeline animates the wrapper, not the button, so it never fights the button's own hover transition.
 */
function LandingButton({
  label,
  primary = false,
  heldBack,
  onClick,
}: {
  label: string;
  primary?: boolean;
  heldBack: boolean;
  onClick: () => void;
}) {
  return (
    <div data-reveal className="flex" style={heldBack ? HELD_BACK : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={`${BUTTON_BASE} ${
          primary
            ? "glass-button bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground hover:shadow-xl hover:shadow-primary/40"
            : "glass-control text-fg hover:border-primary/60 hover:text-primary-text"
        }`}
      >
        {label}
        {primary && (
          <ArrowRight
            aria-hidden
            size={18}
            weight="bold"
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        )}
      </button>
    </div>
  );
}

/**
 * The sign-in landing page, revealed in a fixed order: the Orbit logo plays its intro in the middle of the screen (the
 * letters circle the planet, then form the word); it shrinks and glides up to its place; the slogan appears under it;
 * rings fade in behind, each carrying a department logo. Then the page holds still, and the two actions - "Đăng nhập"
 * and "Bắt đầu", each of which opens its own window (sign in / register) over the page - appear only when the visitor
 * first shows they are there: the pointer starts to move (a faint hint shows after a moment), or they press, type,
 * scroll or touch; on a phone, with no pointer to wait for, they come by themselves, and after a long wait they come
 * for everyone. A link such as `/login?open=login`, or the /register page, skips the intro and opens that window
 * straight away. Anyone who prefers reduced motion, or has already seen the intro in this page load, gets the finished
 * page, buttons included, at once.
 */
export function AuthLanding({ initialView = null }: { initialView?: AuthView | null }) {
  const [phase, setPhase] = useState<Phase>("pending");
  const [animated, setAnimated] = useState(true);
  const [view, setView] = useState<AuthView | null>(null);
  const [ringsScale, setRingsScale] = useState(1);
  /** The sequence is over and the buttons are waiting for the visitor to show up. */
  const [waiting, setWaiting] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLElement>(null);

  // Decided before the first paint on the client; the server always renders the page as the intro's first frame.
  useIsomorphicLayoutEffect(() => {
    if (initialView !== null || hasIntroPlayed() || prefersReducedMotion()) {
      markIntroPlayed();
      setAnimated(false);
      setPhase("ready");
      setView(initialView);
      return;
    }
    // Start the logo in the middle of the screen, bigger; it is moved to its place in the layout when the intro ends.
    const logo = logoRef.current;
    if (logo) {
      gsap.set(logo, { clearProps: "transform" }); // measure the logo where the layout puts it (a second run in dev must not measure a moved one)
      const y = centerOffset(logo.getBoundingClientRect(), window.innerHeight);
      const scale = Math.min(INTRO_SCALE, (window.innerWidth * 0.8) / LOGO_WIDTH); // never wider than the screen on a phone
      gsap.set(logo, { y, scale, transformOrigin: "50% 50%" });
    }
    setPhase("playing");
  }, [initialView]);

  // Keep the rings just outside the content (logo, slogan and the two actions), whatever the screen: measured from the
  // group, whose parts are all laid out (only held back) from the start. Layout sizes, so the intro's scaling of the
  // logo does not distort them.
  useEffect(() => {
    const group = groupRef.current;
    const nav = actionsRef.current;
    const tagline = taglineRef.current;
    if (!group || !nav || !tagline) return;
    const measure = () => {
      const boxes = Array.from(nav.children).map((child) => child.getBoundingClientRect());
      if (boxes.length === 0) return;
      const actionsWidth = Math.max(...boxes.map((b) => b.right)) - Math.min(...boxes.map((b) => b.left));
      const sloganWidth = tagline.firstElementChild?.getBoundingClientRect().width ?? 0;
      setRingsScale(
        haloScale({
          width: Math.max(LOGO_WIDTH, actionsWidth, sloganWidth),
          height: group.offsetHeight,
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, []);

  // Fetch the windows' code once the page has settled, so the first click opens a window at once.
  useEffect(() => {
    if (phase !== "ready") return;
    const timer = window.setTimeout(() => void loadAuthWindows(), 800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleIntroComplete = useCallback(() => {
    markIntroPlayed();
    setPhase("ready");
  }, []);

  // When the intro ends, one timeline plays the rest in order: the logo shrinks to its place, the slogan appears under
  // it, the rings fade in behind and their department logos pop in one by one. Then the page waits (see `waiting`).
  const { contextSafe } = useGSAP(
    () => {
      if (phase !== "ready" || !animated) return;
      const logo = logoRef.current;
      const tagline = taglineRef.current;
      const halo = haloRef.current;
      if (!logo || !tagline || !halo) return;
      const rings = halo.querySelector("[data-halo-rings]");
      const departmentLogos = gsap.utils.toArray<HTMLElement>("[data-satellite]", halo);

      const timeline = gsap.timeline();
      timeline.to(logo, { y: 0, scale: 1, duration: 0.95, ease: "power3.inOut", clearProps: "transform" }, 0);
      timeline.fromTo(
        tagline,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", clearProps: "transform" },
        0.85,
      );
      timeline.fromTo(rings, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: "power2.out" }, 1.1);
      timeline.fromTo(
        departmentLogos,
        { autoAlpha: 0, scale: 0.4 },
        { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)", stagger: { each: 0.07, from: "random" } },
        1.5,
      );
      timeline.call(() => setWaiting(true));
    },
    { dependencies: [phase, animated] },
  );

  // The two actions rise in turn, the moment the visitor shows they are there.
  const revealActions = contextSafe(() => {
    setWaiting(false);
    const actions = gsap.utils.toArray<HTMLElement>("[data-reveal]", actionsRef.current);
    gsap.fromTo(
      actions,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.14, clearProps: "transform" },
    );
  });
  useRevealOnInput(waiting, revealActions);

  const heldBack = animated;

  return (
    <AuthPageShell backdrop={<DottedBackdrop />}>
      <h1 className="sr-only">Orbit - đăng nhập hoặc bắt đầu</h1>

      {/* Logo, slogan and the two actions form one group; the rings are centred on it, so they enclose all of it. */}
      <div ref={groupRef} className="relative flex w-full flex-col items-center">
        <div
          ref={haloRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <OrbitHalo scale={ringsScale} heldBack={animated} />
        </div>

        <div ref={logoRef} className="relative flex flex-col items-center">
          {animated ? (
            <OrbitIntroLogo width={LOGO_WIDTH} onComplete={handleIntroComplete} />
          ) : (
            <OrbitWordmark width={LOGO_WIDTH} />
          )}
        </div>

        {/* Held back, not removed: the slogan and the actions keep their room, so the logo never jumps when they appear. */}
        <div
          ref={taglineRef}
          className="relative mt-4 flex justify-center"
          style={heldBack ? HELD_BACK : undefined}
        >
          <Tagline />
        </div>

        <nav
          ref={actionsRef}
          aria-label="Đăng nhập hoặc bắt đầu"
          className="relative mt-9 flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <LandingButton label="Đăng nhập" heldBack={heldBack} onClick={() => setView("login")} />
          <LandingButton label="Bắt đầu" primary heldBack={heldBack} onClick={() => setView("register")} />
          {/* Where the buttons will be: a faint hint for people with a pointer, once the page has been still for a moment. */}
          {waiting && window.matchMedia("(hover: hover)").matches && (
            <p aria-hidden className="landing-hint pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-fg-muted">
              <CursorClick size={18} />
              Di chuyển chuột để tiếp tục
            </p>
          )}
        </nav>
      </div>

      {view !== null && <AuthWindows view={view} onViewChange={setView} onClose={() => setView(null)} />}
    </AuthPageShell>
  );
}
