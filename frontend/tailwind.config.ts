import type { Config } from "tailwindcss";

/**
 * Design tokens live here, centrally - components must not hard-code hex colors or
 * one-off spacing values (CLAUDE.md section 46.2 / section 26 design system).
 *
 * primary/surface/danger resolve to CSS variables (see app/globals.css) instead of fixed hex
 * values, so ThemeProvider can switch the whole app's palette at runtime via `data-theme` on
 * <html> - no rebuild needed for a theme change (Phase 4 plan: light/dark/gray/pink themes).
 * The `withOpacity` helper is Tailwind's documented pattern for making that work with opacity
 * modifiers (e.g. bg-primary/50) since a bare `rgb(var(--x))` can't take a Tailwind alpha value.
 */
function withOpacity(variableName: string) {
  return `rgb(var(${variableName}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: withOpacity("--color-primary"),
          foreground: withOpacity("--color-primary-foreground"),
        },
        // Gradient end stop for brand surfaces (buttons, active nav) - `from-primary to-primaryEnd`.
        // Degenerate (equal to primary) on the gray/pink themes, which stay flat on purpose (see
        // app/globals.css).
        primaryEnd: {
          DEFAULT: withOpacity("--color-primary-end"),
        },
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          muted: withOpacity("--color-surface-muted"),
        },
        danger: {
          DEFAULT: withOpacity("--color-danger"),
          foreground: withOpacity("--color-danger-foreground"),
        },
      },
      // Orbit brand typeface pairing - see app/globals.css for why (applied globally there via
      // element selectors on body/h1-h3); exposed here too so `font-sans`/`font-heading`
      // utilities are available if a component needs to opt in explicitly.
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      spacing: {
        18: "4.5rem",
      },
      // Purposeful motion only (CLAUDE.md section 25): feedback (toast), state changes
      // (skeleton), navigation (page fade) - no bounce/parallax/decorative animation.
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-0.375rem) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // A tab chip grows out of the left while sliding in; closing plays the same motion backwards.
        "tab-slide-in": {
          from: { maxWidth: "0", opacity: "0", paddingLeft: "0", paddingRight: "0", transform: "translateX(-1rem)" },
          to: { maxWidth: "180px", opacity: "1", paddingLeft: "0.75rem", paddingRight: "0.75rem", transform: "translateX(0)" },
        },
        "tab-slide-out": {
          from: { maxWidth: "180px", opacity: "1", paddingLeft: "0.75rem", paddingRight: "0.75rem", transform: "translateX(0)" },
          to: { maxWidth: "0", opacity: "0", paddingLeft: "0", paddingRight: "0", transform: "translateX(-1rem)" },
        },
        // Heading and sign-in form rise into place once the login intro has finished.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(0.75rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(0.25rem) scale(0.95)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "pop-in": "pop-in 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        "tab-slide-in": "tab-slide-in 320ms cubic-bezier(0.4, 0, 0.2, 1)",
        "tab-slide-out": "tab-slide-out 240ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "rise-in": "rise-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "toast-in": "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-out": "toast-out 150ms ease-in forwards",
      },
    },
  },
  plugins: [],
};

export default config;
