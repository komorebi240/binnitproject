"use client";

import { useRef } from "react";
import { Check } from "@phosphor-icons/react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { stepProgressRatio } from "@/lib/motionMath";

export interface ProgressStep {
  id: string;
  label: string;
}

interface StepProgressProps {
  steps: ProgressStep[];
  currentId: string;
  /** Accessible name of the list, e.g. "Các bước đăng ký". */
  label: string;
}

/**
 * The numbered steps of a multi-step form. A line connects them and fills up to the current step, the current
 * circle pops in and a finished step turns into a check mark (GSAP; under reduced motion everything just
 * jumps to its final look). The current step is exposed to screen readers with `aria-current="step"`.
 */
export function StepProgress({ steps, currentId, label }: StepProgressProps) {
  const rootRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const shownIndexRef = useRef<number | null>(null);
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentId));
  const ratio = stepProgressRatio(currentIndex, steps.length);

  useGSAP(
    () => {
      const fill = fillRef.current;
      const circle = rootRef.current?.querySelector<HTMLElement>(`[data-step-circle="${currentId}"]`);
      if (!fill) return;
      const firstRun = shownIndexRef.current === null;
      shownIndexRef.current = currentIndex;
      if (prefersReducedMotion() || firstRun) {
        gsap.set(fill, { scaleX: ratio });
        return;
      }
      gsap.to(fill, { scaleX: ratio, duration: 0.55, ease: "power3.inOut", overwrite: true });
      if (circle) gsap.fromTo(circle, { scale: 0.7 }, { scale: 1, duration: 0.5, ease: "back.out(2.2)", clearProps: "transform" });
    },
    { dependencies: [currentId, ratio], scope: rootRef },
  );

  // The line runs from the middle of the first circle to the middle of the last one.
  const inset = `${100 / (steps.length * 2)}%`;

  return (
    <ol ref={rootRef} className="relative flex w-full max-w-sm items-start justify-between text-xs" aria-label={label}>
      <span aria-hidden className="absolute top-3.5 h-0.5 -translate-y-1/2 rounded bg-line" style={{ left: inset, right: inset }}>
        <span ref={fillRef} className="block h-full origin-left rounded bg-primary" style={{ transform: `scaleX(${ratio})` }} />
      </span>
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="relative flex flex-1 flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
            <span
              data-step-circle={step.id}
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200 ${
                active
                  ? "gradient-surface border-transparent bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground"
                  : done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line-strong bg-surface text-fg-faint"
              }`}
            >
              {done ? <Check size={14} weight="bold" aria-label="Đã xong" /> : index + 1}
            </span>
            <span className={`text-center transition-colors duration-200 ${active ? "font-medium text-fg" : "text-fg-muted"}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
