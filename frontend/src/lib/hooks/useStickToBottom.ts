import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { followAction, isNearBottom } from "@/lib/scrollFollow";

interface Options {
  /** Identifies the newest line (e.g. its id); null while there is nothing to show yet. Changes when something new arrives. */
  latestKey: string | null;
  /** Changing this (e.g. switching to another conversation) starts following from scratch. */
  resetKey: string | number | null;
  /** True when the newest line is the viewer's own: always show it. */
  ownLatest: boolean;
}

/**
 * Chat scrolling in one place: opens at the newest line, keeps following while the reader is at the bottom, and when
 * they have scrolled up to read older lines leaves them there and offers a "new messages" button instead.
 * Put `scrollRef` and `onScroll` on the scrolling element; show the button while `canJumpToLatest`.
 */
export function useStickToBottom({ latestKey, resetKey, ownLatest }: Options) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const seenKeyRef = useRef<string | null>(null);
  const seenResetRef = useRef<string | number | null>(resetKey);
  const [canJumpToLatest, setCanJumpToLatest] = useState(false);

  const onScroll = useCallback(() => {
    const area = scrollRef.current;
    if (!area) return;
    atBottomRef.current = isNearBottom(area);
    if (atBottomRef.current) setCanJumpToLatest(false);
  }, []);

  const jumpToLatest = useCallback(() => {
    const area = scrollRef.current;
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, []);

  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (seenResetRef.current !== resetKey) {
      seenResetRef.current = resetKey;
      seenKeyRef.current = null;
      atBottomRef.current = true;
    }
    if (!area || latestKey === null) return;

    const action = followAction({
      firstContent: seenKeyRef.current === null,
      atBottom: atBottomRef.current,
      ownLatest,
      changed: seenKeyRef.current !== latestKey,
    });
    seenKeyRef.current = latestKey;
    if (action === "scroll") {
      area.scrollTop = area.scrollHeight;
      atBottomRef.current = true;
      setCanJumpToLatest(false);
    } else if (action === "offer-jump") {
      setCanJumpToLatest(true);
    }
  }, [latestKey, resetKey, ownLatest]);

  return { scrollRef, onScroll, canJumpToLatest, jumpToLatest };
}
