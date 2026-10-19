/**
 * Reads a captured piece of text on this device only (nothing is sent anywhere) and picks out what people usually want
 * to act on: dates and times, email addresses, phone numbers, links, amounts of money and other numbers, plus simple
 * counts. Vietnamese and English ways of writing them are both understood ("9h30", "3 giờ chiều", "ngày 12 tháng 10",
 * "1,5 triệu", "500k", "$1,200"...).
 *
 * Each character belongs to at most one finding: categories are read in a fixed order (links, emails, phones, dates,
 * times, money, percentages, numbers) and a later one skips text an earlier one already took, so "0912 345 678" is a
 * phone and not three numbers.
 */

export interface DateFinding {
  text: string;
  /** yyyy-mm-dd */
  date: string;
}

export interface TimeFinding {
  text: string;
  /** HH:mm, 24-hour */
  time: string;
}

export type Currency = "VND" | "USD" | "EUR";

export interface MoneyFinding {
  text: string;
  amount: number;
  currency: Currency;
}

export interface TextAnalysis {
  stats: { characters: number; words: number; lines: number };
  dates: DateFinding[];
  times: TimeFinding[];
  emails: string[];
  phones: string[];
  links: string[];
  money: MoneyFinding[];
  /** Percentages and other numbers that are not part of anything above. */
  numbers: string[];
  /** What "Create a task" / "Add an event" are pre-filled with. */
  suggestion: { title: string; date: string | null; time: string | null };
}

/** More than this per kind is noise in a small panel. */
export const MAX_FINDINGS = 20;
const MAX_TITLE_LENGTH = 120;

// Unicode-aware word edges: JavaScript's \b only knows ASCII letters, so "ngày" would have an edge inside it.
const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";

class TakenSpans {
  private readonly spans: Array<[number, number]> = [];

  isFree(start: number, end: number): boolean {
    return this.spans.every(([s, e]) => end <= s || start >= e);
  }

  take(start: number, end: number): void {
    this.spans.push([start, end]);
  }
}

type Located<T> = { value: T; at: number };

/** Every match of `pattern` that is still free and that `read` accepts, with where it starts; accepted matches are taken. */
function collectAt<T>(text: string, pattern: RegExp, taken: TakenSpans, read: (match: RegExpMatchArray) => T | null): Located<T>[] {
  const found: Located<T>[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!taken.isFree(start, end)) continue;
    const value = read(match);
    if (value === null) continue;
    taken.take(start, end);
    found.push({ value, at: start });
  }
  return found;
}

/** The findings of one kind, in reading order whichever of its patterns found them. */
function inReadingOrder<T>(...groups: Located<T>[][]): T[] {
  return groups
    .flat()
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_FINDINGS)
    .map((found) => found.value);
}

const pad = (value: number) => String(value).padStart(2, "0");

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function shiftDays(today: Date, days: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fullYear(raw: string): number {
  const year = Number(raw);
  return raw.length === 2 ? 2000 + year : year;
}

function readDates(text: string, taken: TakenSpans, today: Date): DateFinding[] {
  const thisYear = today.getFullYear();
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string | null]> = [
    [new RegExp(`${START}(\\d{4})-(\\d{1,2})-(\\d{1,2})${END}`, "gu"), (m) => isoDate(Number(m[1]), Number(m[2]), Number(m[3]))],
    [
      new RegExp(`${START}(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4}|\\d{2})${END}`, "gu"),
      (m) => isoDate(fullYear(m[3] as string), Number(m[2]), Number(m[1])),
    ],
    [
      new RegExp(`${START}ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})(?:\\s*(?:năm|,)?\\s*(\\d{4}))?${END}`, "giu"),
      (m) => isoDate(m[3] ? Number(m[3]) : thisYear, Number(m[2]), Number(m[1])),
    ],
    [new RegExp(`${START}(\\d{1,2})/(\\d{1,2})${END}(?![/.-]\\d)`, "gu"), (m) => isoDate(thisYear, Number(m[2]), Number(m[1]))],
    [new RegExp(`${START}(hôm nay|today)${END}`, "giu"), () => shiftDays(today, 0)],
    [new RegExp(`${START}(ngày mai|tomorrow)${END}`, "giu"), () => shiftDays(today, 1)],
    [new RegExp(`${START}(ngày kia|ngày mốt)${END}`, "giu"), () => shiftDays(today, 2)],
  ];
  return inReadingOrder(
    ...patterns.map(([pattern, read]) =>
      collectAt(text, pattern, taken, (m): DateFinding | null => {
        const date = read(m);
        return date === null ? null : { text: m[0], date };
      }),
    ),
  );
}

function toTime(hour: number, minute: number, period: string | undefined): string | null {
  let h = hour;
  const p = period?.toLowerCase();
  if (p === "pm" || p === "chiều" || p === "tối") {
    if (h < 12) h += 12;
  } else if (p === "am" || p === "sáng") {
    if (h === 12) h = 0;
  } else if (p === "trưa" && h < 11) {
    h += 12;
  }
  if (h > 23 || minute > 59) return null;
  return `${pad(h)}:${pad(minute)}`;
}

function readTimes(text: string, taken: TakenSpans): TimeFinding[] {
  const period = "(?:\\s*(am|pm|sáng|trưa|chiều|tối))?";
  const colon = new RegExp(`${START}(\\d{1,2}):(\\d{2})${period}${END}`, "giu");
  const words = new RegExp(`${START}(\\d{1,2})\\s*(?:h|giờ)\\s*(?:(\\d{1,2})\\s*(?:phút|p)?)?${period}${END}`, "giu");
  const read = (m: RegExpMatchArray): TimeFinding | null => {
    const time = toTime(Number(m[1]), m[2] ? Number(m[2]) : 0, m[3]);
    return time === null ? null : { text: m[0], time };
  };
  return inReadingOrder(collectAt(text, colon, taken, read), collectAt(text, words, taken, read));
}

/** The digits of a phone number, or null when it is not one (wrong length). */
function readPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 9 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("84")) return digits.length === 11 || digits.length === 12 ? `+${digits}` : null;
  return digits.length === 10 || digits.length === 11 ? digits : null;
}

function readPhones(text: string, taken: TakenSpans): string[] {
  const local = new RegExp(`${START}(?:\\+84|84|0)(?:[\\s.-]?\\d){8,10}(?!\\d)`, "gu");
  const international = /(?<![\p{L}\p{N}+])\+\d(?:[\s.-]?\d){7,13}(?!\d)/gu;
  return inReadingOrder(
    collectAt(text, local, taken, (m) => readPhone(m[0])),
    collectAt(text, international, taken, (m) => readPhone(m[0])),
  );
}

/**
 * "1.500.000" and "1,500,000" are thousands, "1,5" and "2.5" are decimals: a separator that repeats, or one followed by
 * exactly three digits, groups thousands; otherwise it is the decimal point. With both kinds, the last one is decimal.
 */
export function parseAmount(raw: string): number | null {
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");
  let normalized = raw;
  if (hasDot && hasComma) {
    const decimal = raw.lastIndexOf(".") > raw.lastIndexOf(",") ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    normalized = raw.split(thousands).join("").replace(decimal, ".");
  } else if (hasDot || hasComma) {
    const separator = hasDot ? "." : ",";
    const parts = raw.split(separator);
    const groupsThousands = parts.length > 2 || (parts[1] ?? "").length === 3;
    normalized = groupsThousands ? parts.join("") : parts.join(".");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  nghìn: 1_000,
  ngàn: 1_000,
  tr: 1_000_000,
  triệu: 1_000_000,
  tỷ: 1_000_000_000,
  tỉ: 1_000_000_000,
};

function currencyOf(symbol: string | undefined): Currency | null {
  switch (symbol?.toLowerCase()) {
    case "$":
    case "usd":
      return "USD";
    case "€":
    case "eur":
      return "EUR";
    case "đ":
    case "₫":
    case "vnd":
    case "vnđ":
    case "đồng":
      return "VND";
    default:
      return null;
  }
}

function readMoney(text: string, taken: TakenSpans): MoneyFinding[] {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(\\$|€)?\\s?(\\d+(?:[.,]\\d+)*)\\s*(k|nghìn|ngàn|triệu|tr|tỷ|tỉ)?\\s*(đồng|vnđ|vnd|usd|eur|đ|₫|\\$|€)?(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return inReadingOrder(collectAt(text, pattern, taken, (m): MoneyFinding | null => {
    const prefix = m[1];
    const multiplierWord = m[3]?.toLowerCase();
    const suffix = m[4];
    if (!prefix && !multiplierWord && !suffix) return null;
    const value = parseAmount(m[2] as string);
    if (value === null) return null;
    const currency = currencyOf(prefix) ?? currencyOf(suffix) ?? "VND";
    const amount = Math.round(value * (multiplierWord ? (MULTIPLIERS[multiplierWord] ?? 1) : 1) * 100) / 100;
    return { text: m[0].trim(), amount, currency };
  }));
}

function trimLink(raw: string): string {
  return raw.replace(/[.,;:!?)\]}>'"]+$/u, "");
}

/** The first non-empty line, shortened with "…" past `maxLength`: the title a task, event or note made from the text gets. */
export function titleFromText(text: string, maxLength = MAX_TITLE_LENGTH): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength - 1).trimEnd()}…` : firstLine;
}

export function analyzeText(text: string, today: Date): TextAnalysis {
  const taken = new TakenSpans();
  const links = inReadingOrder(collectAt(text, /(?:https?:\/\/|www\.)[^\s<>"']+/giu, taken, (m) => trimLink(m[0])));
  const emails = inReadingOrder(collectAt(text, /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, taken, (m) => m[0]));
  const phones = readPhones(text, taken);
  const dates = readDates(text, taken, today);
  const times = readTimes(text, taken);
  const money = readMoney(text, taken);
  const numbers = inReadingOrder(
    collectAt(text, new RegExp(`${START}\\d+(?:[.,]\\d+)?\\s?%`, "gu"), taken, (m) => m[0]),
    collectAt(text, new RegExp(`${START}\\d+(?:[.,]\\d+)*${END}`, "gu"), taken, (m) => m[0]),
  );

  const words = text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const lines = text.split("\n").filter((line) => line.trim().length > 0).length;

  return {
    stats: { characters: text.length, words, lines },
    dates,
    times,
    emails,
    phones,
    links,
    money,
    numbers,
    suggestion: { title: titleFromText(text), date: dates[0]?.date ?? null, time: times[0]?.time ?? null },
  };
}
