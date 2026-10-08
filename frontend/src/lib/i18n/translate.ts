import { INTL_LOCALE, type Locale } from "./locales";

/** Values for the `{name}` placeholders of a message. */
export type Params = Record<string, string | number>;

export type Messages = Record<string, string>;

/** Replaces every `{name}` with its value; a placeholder with no value is left as it is, so the gap is visible. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in params ? String(params[name]) : placeholder));
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

function pluralCategory(locale: Locale, count: number): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE[locale]);
    pluralRules.set(locale, rules);
  }
  return rules.select(count);
}

/**
 * The text for `key` in `messages`, falling back to the `fallback` language and finally to the key itself (so a gap
 * shows up as an odd-looking label, never as a blank or a crash). When `params.count` is a number and the message has
 * plural forms (`key_one`, `key_other`), the form for that count in this language is used - English needs "1 task" and
 * "2 tasks", Vietnamese has one form and both of its entries read the same.
 */
export function translate(locale: Locale, messages: Messages, fallback: Messages, key: string, params?: Params): string {
  let chosen = key;
  if (params && typeof params.count === "number") {
    const category = pluralCategory(locale, params.count);
    if (`${key}_${category}` in messages) chosen = `${key}_${category}`;
    else if (`${key}_other` in messages) chosen = `${key}_other`;
  }
  return interpolate(messages[chosen] ?? fallback[chosen] ?? key, params);
}
