import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Registered once for the whole app (never inside a component); every animation helper imports from here.
// The Flip plugin is NOT here: it is only used inside the dashboard (see motionFlip.ts), so the sign-in pages do not
// download it.
gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/** True when the user asked the system for less motion; checked at the moment an animation would start. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animations only run under this query; with "reduce" people get the end state at once (see `gsap.matchMedia()` users). */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
