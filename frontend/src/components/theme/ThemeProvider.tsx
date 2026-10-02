"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = ["light", "dark", "gray", "pink"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

/**
 * Per-device preference (CLAUDE.md section 41 — "tuỳ nhu cầu người dùng" doesn't imply it must
 * follow the account across machines, and localStorage is the simplest thing that satisfies the
 * actual requirement — no new backend column/endpoint needed). Reads localStorage only after
 * mount to avoid a server/client render mismatch (Next.js SSR has no access to it).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isTheme(stored)) {
        setThemeState(stored);
      }
    } catch {
      // Private browsing / blocked storage — fall back to the default theme silently.
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing else to do if storage is unavailable — the theme still applies for this session.
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
