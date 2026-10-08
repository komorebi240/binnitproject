import { isLocale, type Locale } from "./locales";

/** Where the browser remembers the language: one choice for the whole product (marketing page, sign-in, app). */
export const LOCALE_STORAGE_KEY = "orbit-locale";

export function readStoredLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null; // storage blocked (private window...): behave as if nothing was chosen
  }
}

export function rememberLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Nothing else to do - the choice just will not outlive this page.
  }
}
