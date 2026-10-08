import type { TranslationKey } from "@/lib/i18n/dictionary";

const SHORT_KEYS: TranslationKey[] = [
  "common.weekdaySun",
  "common.weekdayMon",
  "common.weekdayTue",
  "common.weekdayWed",
  "common.weekdayThu",
  "common.weekdayFri",
  "common.weekdaySat",
];

/** The message key of a weekday's short name; `weekday` is `Date.getDay()` (0 = Sunday). Translate it with `t`. */
export function weekdayShortKey(weekday: number): TranslationKey {
  return SHORT_KEYS[weekday % 7] ?? "common.weekdaySun";
}
