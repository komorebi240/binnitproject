/**
 * Geometry and markup shared by the static wordmark (header, register, invite) and the animated one
 * on the login page, so the animation always ends on exactly the logo everyone else sees.
 * All numbers are in the 182 x 64 viewBox of the original wordmark.
 */
export const LOGO = {
  width: 182,
  height: 64,
  planet: { cx: 27, cy: 29, r: 15.5 },
  ring: { cx: 28, cy: 36, rx: 25, ry: 8.5, tilt: -18, strokeWidth: 3.5, color: "#E9D5FF" },
  gradient: { x1: 8, y1: 10, x2: 44, y2: 46, from: "#4F46E5", to: "#7C3AED" },
  text: { x: 66, baseline: 50, fontSize: 34, letterSpacing: 1, word: "ORBIT" },
} as const;

/** Space Grotesk capital height as a share of the font size (the glyphs are centred on this when orbiting). */
export const CAP_HEIGHT_RATIO = 0.7;

/** Brand font for the wordmark (Space Grotesk via the `font-heading` token); colour switches with the theme in globals.css. */
export const WORD_TEXT_CLASS = "orbit-wordmark-text font-heading font-bold";

export function OrbitGradientDefs({ id }: { id: string }) {
  const { gradient } = LOGO;
  return (
    <defs>
      <linearGradient
        id={id}
        x1={gradient.x1}
        y1={gradient.y1}
        x2={gradient.x2}
        y2={gradient.y2}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor={gradient.from} />
        <stop offset="1" stopColor={gradient.to} />
      </linearGradient>
    </defs>
  );
}

/** The planet with its tilted ring (the ring is drawn first so the planet covers its middle). */
export function OrbitLogoMark({ gradientId }: { gradientId: string }) {
  const { ring, planet } = LOGO;
  return (
    <>
      <ellipse
        cx={ring.cx}
        cy={ring.cy}
        rx={ring.rx}
        ry={ring.ry}
        fill="none"
        stroke={ring.color}
        strokeWidth={ring.strokeWidth}
        transform={`rotate(${ring.tilt} ${ring.cx} ${ring.cy})`}
      />
      <circle cx={planet.cx} cy={planet.cy} r={planet.r} fill={`url(#${gradientId})`} />
    </>
  );
}
