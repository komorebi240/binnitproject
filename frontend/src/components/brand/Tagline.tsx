/** The brand slogan, shown under the logo on the sign-in pages and used in the page description. */
export const TAGLINE = "Everything stays in orbit.";

export function Tagline({ className = "" }: { className?: string }) {
  return <p className={`text-xs font-medium uppercase tracking-[0.18em] text-fg-muted ${className}`}>{TAGLINE}</p>;
}
