"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { replayIntro } from "@/features/auth/introState";

/** How long the page takes to fade out before the sign-in page (and its logo intro) takes over. */
const EXIT_MS = 300;

/**
 * The marketing page's call to action. It is a real link to /login (so it works without script, in a new tab, and for
 * search engines); a plain click first fades the page out, so the logo intro starts on a clean aurora, and arms the
 * intro to play - the button promises exactly that moment, the logo circling its planet.
 */
export function LandingCta({ className, children }: { className: string; children: ReactNode }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  // The fade is a class on <html> that dims the whole marketing page (see `.mk-leaving` in globals.css); it must be
  // gone when the person comes back to this page.
  useEffect(() => {
    document.documentElement.classList.toggle("mk-leaving", leaving);
    return () => document.documentElement.classList.remove("mk-leaving");
  }, [leaving]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving) return;
    replayIntro();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/login");
      return;
    }
    setLeaving(true);
    window.setTimeout(() => router.push("/login"), EXIT_MS);
  }

  return (
    <Link href="/login" onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
