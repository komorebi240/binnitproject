import { useId } from "react";
import { LOGO, OrbitGradientDefs, OrbitLogoMark, WORD_TEXT_CLASS } from "./orbitLogo";

interface OrbitWordmarkProps {
  width: number;
  height: number;
  className?: string;
}

/**
 * Orbit logo + wordmark as inline SVG. Inline (not an <img>) so the text really uses the brand font
 * - an SVG loaded through <img> cannot reach the page's web fonts - and so its colour follows the
 * theme through CSS (see `.orbit-wordmark-text` in globals.css) instead of needing a second file.
 */
export function OrbitWordmark({ width, height, className }: OrbitWordmarkProps) {
  const gradientId = `orbit-gradient-${useId().replace(/:/g, "")}`;
  const { text } = LOGO;

  return (
    <svg
      role="img"
      aria-label="Orbit"
      width={width}
      height={height}
      viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
      className={className}
    >
      <OrbitGradientDefs id={gradientId} />
      <OrbitLogoMark gradientId={gradientId} />
      <text
        className={WORD_TEXT_CLASS}
        x={text.x}
        y={text.baseline}
        fontSize={text.fontSize}
        letterSpacing={text.letterSpacing}
      >
        {text.word}
      </text>
    </svg>
  );
}
