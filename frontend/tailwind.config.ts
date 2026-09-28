import type { Config } from "tailwindcss";

/**
 * Design tokens live here, centrally — components must not hard-code hex colors or
 * one-off spacing values (CLAUDE.md section 46.2 / section 26 design system).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f3f4f6",
        },
        danger: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      spacing: {
        18: "4.5rem",
      },
      // Purposeful motion only (CLAUDE.md section 25): feedback (toast), state changes
      // (skeleton), navigation (page fade) — no bounce/parallax/decorative animation.
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
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
        "toast-in": "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-out": "toast-out 150ms ease-in forwards",
      },
    },
  },
  plugins: [],
};

export default config;
