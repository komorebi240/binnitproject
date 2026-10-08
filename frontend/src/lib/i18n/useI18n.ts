"use client";

import { createContext, useContext } from "react";
import type { TranslationKey } from "./dictionary";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "./locales";
import { translate, type Params } from "./translate";
import { VI } from "./vi";

export interface I18n {
  locale: Locale;
  /** The tag for `toLocaleDateString` and friends: "vi-VN" or "en-US". */
  intlLocale: string;
  /** The message for a key, with `{name}` placeholders filled from `params` (and the plural form for `params.count`). */
  t: (key: TranslationKey, params?: Params) => string;
  /** Switches the language everywhere and remembers the choice in this browser. */
  setLocale: (locale: Locale) => void;
}

/** What a component gets outside a provider (static rendering of an isolated piece, a test): Vietnamese. */
const FALLBACK: I18n = {
  locale: DEFAULT_LOCALE,
  intlLocale: INTL_LOCALE[DEFAULT_LOCALE],
  t: (key, params) => translate(DEFAULT_LOCALE, VI, VI, key, params),
  setLocale: () => undefined,
};

export const I18nContext = createContext<I18n>(FALLBACK);

export function useI18n(): I18n {
  return useContext(I18nContext);
}
