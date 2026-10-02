"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const THEMES = ["light", "dark", "gray", "pink"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_PREFIX = "theme:";
const DEFAULT_THEME: Theme = "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Which account's preference is active; null (signed out) always shows the default theme. */
  setUserScope: (userId: number | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

function readStoredTheme(userId: number): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + userId);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // Private browsing / blocked storage
  }
}

/**
 * The chosen theme belongs to the ACCOUNT (stored under `theme:<userId>`), not to the browser: a
 * second account that signs in on the same machine gets its own theme instead of inheriting the
 * previous one, and the login screens always use the default. The dashboard layout declares whose
 * preference applies via `setUserScope`. Read only after mount (SSR has no localStorage).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    setThemeState(userId === null ? DEFAULT_THEME : readStoredTheme(userId));
  }, [userId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (userId === null) return;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + userId, next);
      } catch {
        // Nothing else to do if storage is unavailable - the theme still applies for this session.
      }
    },
    [userId],
  );

  const value = useMemo(() => ({ theme, setTheme, setUserScope: setUserId }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
