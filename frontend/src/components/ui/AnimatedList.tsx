"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/motion";
import { staggerEach } from "@/lib/motionMath";

interface AnimatedListProps {
  /** `ul` (children are `li`) or `div` for grids of buttons. */
  as?: "ul" | "div";
  className?: string;
  children: React.ReactNode;
}

/**
 * A list (`<ul>` or a grid `<div>`) whose direct children rise and fade in one after another the moment it appears.
 * Only the first appearance animates - later changes to the items do not replay it (use `useFlipList` for
 * reordering) - and people who prefer reduced motion get the finished list at once.
 */
export const AnimatedList = forwardRef<HTMLElement, AnimatedListProps>(({ as: Tag = "ul", className, children }, ref) => {
  const listRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => listRef.current as HTMLElement);

  useGSAP(
    () => {
      const items = Array.from(listRef.current?.children ?? []);
      if (items.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(items, {
          opacity: 0,
          y: 14,
          duration: 0.4,
          ease: "power2.out",
          stagger: staggerEach(items.length),
          clearProps: "opacity,transform",
        });
      });
      return () => mm.revert();
    },
    { scope: listRef },
  );

  return (
    <Tag ref={listRef as never} className={className}>
      {children}
    </Tag>
  );
});

AnimatedList.displayName = "AnimatedList";
