"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";

/** A green circle that draws itself and then ticks, for "done" moments (password changed, company created). */
export function AnimatedCheck({ size = 72, label }: { size?: number; label: string }) {
  const rootRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const circle = rootRef.current?.querySelector<SVGPathElement>("[data-check-circle]");
      const tick = rootRef.current?.querySelector<SVGPathElement>("[data-check-tick]");
      if (!circle || !tick || prefersReducedMotion()) return;
      const circleLength = circle.getTotalLength();
      const tickLength = tick.getTotalLength();
      gsap.set(circle, { strokeDasharray: circleLength, strokeDashoffset: circleLength });
      gsap.set(tick, { strokeDasharray: tickLength, strokeDashoffset: tickLength });
      gsap
        .timeline()
        .to(circle, { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" })
        .to(tick, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, "-=0.05")
        .fromTo(rootRef.current, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)" }, "-=0.3");
    },
    { scope: rootRef },
  );

  return (
    <svg ref={rootRef} role="img" aria-label={label} width={size} height={size} viewBox="0 0 72 72" fill="none" className="text-success">
      <circle cx="36" cy="36" r="33" className="fill-success/10" />
      <path data-check-circle d="M36 3a33 33 0 1 1 0 66a33 33 0 1 1 0 -66" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path data-check-tick d="M22 37l10 10l19 -21" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
