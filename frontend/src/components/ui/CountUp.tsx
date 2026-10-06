"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { countDuration, decimalsOf, formatCount } from "@/lib/motionMath";

interface CountUpProps {
  value: number;
  suffix?: string;
  className?: string;
}

/**
 * A number that counts up to its value when it first shows (and from the old value to the new one when it
 * changes). Screen readers get the final number at once; under reduced motion nobody sees it counting.
 */
export function CountUp({ value, suffix = "", className }: CountUpProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);
  const decimals = decimalsOf(value);
  const final = `${formatCount(value, decimals)}${suffix}`;

  useGSAP(
    () => {
      const node = textRef.current;
      if (!node) return;
      if (prefersReducedMotion()) {
        shownRef.current = value;
        node.textContent = final;
        return;
      }
      const counter = { n: shownRef.current };
      gsap.to(counter, {
        n: value,
        duration: countDuration(value),
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => {
          shownRef.current = counter.n;
          node.textContent = `${formatCount(counter.n, decimals)}${suffix}`;
        },
      });
    },
    { dependencies: [value, suffix], scope: textRef },
  );

  // The animated text is written by GSAP, so React renders no children for it (and the real value for assistive tech).
  return (
    <span className={className}>
      <span ref={textRef} aria-hidden />
      <span className="sr-only">{final}</span>
    </span>
  );
}
