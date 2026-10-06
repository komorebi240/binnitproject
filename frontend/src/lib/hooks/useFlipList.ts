import { useCallback, useRef, type RefObject } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { Flip } from "@/lib/motionFlip";

/**
 * Makes a list glide to its new layout when items are filtered, reordered, added or removed (GSAP Flip).
 *
 * Call the returned `capture()` just BEFORE the state change that rearranges the list, and pass a value
 * that changes with that state (`signature`, e.g. the ids in order). After React has rendered it, the items
 * animate from where they were to where they are now. Without a capture, or under reduced motion, nothing animates.
 */
export function useFlipList(listRef: RefObject<HTMLElement>, signature: string, itemSelector = ":scope > *") {
  const capturedRef = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const capture = useCallback(() => {
    const list = listRef.current;
    if (list) capturedRef.current = Flip.getState(list.querySelectorAll(itemSelector));
  }, [listRef, itemSelector]);

  useGSAP(
    () => {
      const before = capturedRef.current;
      capturedRef.current = null;
      const list = listRef.current;
      if (!before || !list) return;
      if (prefersReducedMotion()) return;
      Flip.from(before, {
        targets: list.querySelectorAll(itemSelector),
        duration: 0.4,
        ease: "power2.inOut",
        onEnter: (entering) => gsap.fromTo(entering, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.3 }),
      });
    },
    { dependencies: [signature], scope: listRef },
  );

  return capture;
}
