import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

/**
 * Minimal brand-recognition background - a few dimmed, oversized planet+ring shapes behind the
 * form, never competing with the login form's contrast (CLAUDE.md section 25: decoration must
 * never get in the way of the actual task). `pointer-events-none` + `aria-hidden` since it's
 * purely decorative; `overflow-hidden` on the parent keeps the oversized shapes from adding
 * scrollbars.
 */
function BackgroundPlanets() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
    >
      <circle cx="120" cy="120" r="140" fill="#4F46E5" opacity="0.06" />
      <ellipse cx="120" cy="120" rx="230" ry="70" fill="none" stroke="#7C3AED" strokeWidth="6" opacity="0.08" transform="rotate(-18 120 120)" />
      <circle cx="1080" cy="700" r="180" fill="#7C3AED" opacity="0.05" />
      <ellipse cx="1080" cy="700" rx="280" ry="85" fill="none" stroke="#4F46E5" strokeWidth="6" opacity="0.07" transform="rotate(-18 1080 700)" />
    </svg>
  );
}

/** Shared frame for every pre-login page (login, forgot password, invitation): centered column over the Orbit planet backdrop, with the language switch in the corner. */
export function AuthPageShell({ children, backdrop }: { children: ReactNode; backdrop?: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4">
      <BackgroundPlanets />
      {backdrop}
      <LanguageSwitcher className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5" />
      <div className="relative flex w-full flex-col items-center gap-6">{children}</div>
    </main>
  );
}
