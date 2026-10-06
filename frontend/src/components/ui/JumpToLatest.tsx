"use client";

import { ArrowDown } from "@phosphor-icons/react";

/** The "new messages" pill shown over a chat whose reader has scrolled up while something new arrived. */
export function JumpToLatest({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-in absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowDown size={14} weight="bold" aria-hidden />
      Tin mới
    </button>
  );
}
