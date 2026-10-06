"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { stepDirection } from "@/lib/motionMath";

interface StepTransitionProps {
  /** Changes whenever another step is shown. */
  stepKey: string;
  /** Position of the step in the flow, so going forward and going back slide in opposite directions. */
  index: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps the current step of a multi-step form. When the step changes, the new step slides in from the side it
 * belongs to while its fields rise one after another, the box eases to the new height instead of jumping, and
 * the first field gets the focus so people can keep typing. Under reduced motion the step just swaps.
 */
export function StepTransition({ stepKey, index, className = "", children }: StepTransitionProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef<number | null>(null);
  const heightRef = useRef(0);
  const morphingRef = useRef(false);

  // Remember the box's height whenever it changes by itself (an error message appears, a field is added...).
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    heightRef.current = box.offsetHeight;
    const observer = new ResizeObserver(() => {
      if (!morphingRef.current) heightRef.current = box.offsetHeight;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      const box = boxRef.current;
      const step = box?.firstElementChild as HTMLElement | null;
      if (!box || !step) return;
      const previousIndex = previousIndexRef.current;
      previousIndexRef.current = index;
      // The step is normally one <form>: its direct children (fields, buttons) are what rises in turn.
      const fields = Array.from((step.firstElementChild ?? step).children);

      if (previousIndex === null) {
        if (!prefersReducedMotion()) gsap.from(fields, { opacity: 0, y: 12, duration: 0.4, ease: "power2.out", stagger: 0.05, clearProps: "opacity,transform" });
        return;
      }
      step.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
      if (prefersReducedMotion()) return;

      const direction = stepDirection(previousIndex, index);
      gsap.from(step, { x: direction * 36, opacity: 0, duration: 0.45, ease: "power3.out", clearProps: "opacity,transform" });
      gsap.from(fields, { opacity: 0, y: 10, duration: 0.35, ease: "power2.out", stagger: 0.05, delay: 0.1, clearProps: "opacity,transform" });

      const from = heightRef.current;
      gsap.set(box, { clearProps: "height" });
      const to = box.offsetHeight;
      if (from > 0 && Math.abs(from - to) > 2) {
        morphingRef.current = true;
        gsap.fromTo(
          box,
          { height: from, overflow: "hidden" },
          {
            height: to,
            duration: 0.4,
            ease: "power3.inOut",
            onComplete: () => {
              gsap.set(box, { clearProps: "height,overflow" });
              morphingRef.current = false;
              heightRef.current = box.offsetHeight;
            },
          },
        );
      }
    },
    { dependencies: [stepKey], scope: boxRef },
  );

  return (
    <div ref={boxRef} className={className}>
      <div key={stepKey} className="w-full">
        {children}
      </div>
    </div>
  );
}
