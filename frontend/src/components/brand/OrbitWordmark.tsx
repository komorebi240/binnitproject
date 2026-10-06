import { useId } from "react";
import { LOGO, logoHeightFor, OrbitLogoDefs, OrbitLogoMark, OrbitWord } from "./orbitLogo";

interface OrbitWordmarkProps {
  /** Width in px; the height follows from the logo's proportions. Keep it at 96 px or more (see docs/brand/README.md). */
  width: number;
  className?: string;
}

/**
 * The Orbit logo lockup (mark + wordmark) as inline SVG. Inline so its colours follow the theme through CSS variables
 * (see `--logo-*` in globals.css) instead of needing a second file per theme; all shapes are paths, so it does not
 * depend on any font being loaded.
 */
export function OrbitWordmark({ width, className }: OrbitWordmarkProps) {
  const id = `orbit-logo-${useId().replace(/:/g, "")}`;

  return (
    <svg
      role="img"
      aria-label="Orbit"
      width={width}
      height={logoHeightFor(width)}
      viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <OrbitLogoDefs id={id} />
      <OrbitLogoMark id={id} />
      <OrbitWord />
    </svg>
  );
}
