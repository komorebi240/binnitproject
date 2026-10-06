import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import { hasIntroPlayed, markIntroPlayed, replayIntro } from "../auth/introState";
import { COPY } from "./copy";
import { COLUMN_ICONS, FEATURE_ICONS } from "./icons";
import { LOCALE_PATH, LOCALES, MARKETING_PATHS } from "./locales";
import { marketingMetadata } from "./metadata";

const pageSource = readFileSync(join(process.cwd(), "src", "features", "marketing", "MarketingPage.tsx"), "utf8");
const VI = COPY.vi;
const EN = COPY.en;

/** Every string in a dictionary with the path that leads to it, e.g. "features.items.0.title". */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}.${i}`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Paths whose text is the same in every language on purpose (codes, ids, initials of made-up people, priority keys). */
const SAME_IN_EVERY_LANGUAGE = /^(locale|nav\.\d+\.href|glimpse\.columns\.\d+\.tasks\.\d+\.(who|priority))$/;

const VIETNAMESE_LETTERS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe("marketing copy", () => {
  it("has no empty line in any language", () => {
    for (const code of LOCALES) {
      const lines = leaves(COPY[code]);
      expect(lines.length).toBeGreaterThan(60);
      for (const [path, text] of lines) expect([code, path, text.trim().length > 1]).toEqual([code, path, true]);
    }
  });

  it("has the same lists, in the same order, in every language", () => {
    const pathsOf = (code: (typeof LOCALES)[number]) => leaves(COPY[code]).map(([path]) => path);
    expect(pathsOf("en")).toEqual(pathsOf("vi"));
  });

  it("translates every line (nothing is left in the other language)", () => {
    const english = new Map(leaves(EN));
    for (const [path, vietnamese] of leaves(VI)) {
      if (SAME_IN_EVERY_LANGUAGE.test(path)) continue;
      expect([path, english.get(path) === vietnamese]).toEqual([path, false]);
    }
  });

  it("keeps Vietnamese letters out of the English page", () => {
    for (const [path, text] of leaves(EN)) expect([path, VIETNAMESE_LETTERS.test(text)]).toEqual([path, false]);
  });

  it("matches every icon to its item", () => {
    expect(FEATURE_ICONS).toHaveLength(VI.features.items.length);
    expect(COLUMN_ICONS).toHaveLength(VI.glimpse.columns.length);
  });

  it("lists every feature once", () => {
    for (const code of LOCALES) {
      const titles = COPY[code].features.items.map((f) => f.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});

describe("marketing page structure", () => {
  it("points every menu link at a section that exists on the page, in every language", () => {
    for (const code of LOCALES) {
      for (const link of COPY[code].nav) {
        expect(link.href.startsWith("#")).toBe(true);
        expect(pageSource).toContain(`id="${link.href.slice(1)}"`);
      }
    }
  });

  it("gives every section heading the id its section is labelled by", () => {
    for (const id of pageSource.matchAll(/aria-labelledby="([a-z-]+)"/g)) {
      expect(pageSource).toMatch(new RegExp(`id[="{]+${id[1]}`));
    }
  });
});

describe("languages and addresses", () => {
  it("serves each language at its own address, and the middleware lets them all through", () => {
    expect(LOCALE_PATH).toEqual({ vi: "/", en: "/en" });
    expect(MARKETING_PATHS).toEqual(["/", "/en"]);
  });

  it("tells search engines about every language, with Vietnamese as the default", () => {
    for (const code of LOCALES) {
      const meta = marketingMetadata(code);
      expect(meta.alternates?.canonical).toBe(LOCALE_PATH[code]);
      expect(meta.alternates?.languages).toEqual({ vi: "/", en: "/en", "x-default": "/" });
      expect(meta.title).toBe(COPY[code].meta.title);
    }
  });
});

describe("intro state", () => {
  it("replays the intro when the call to action asks for it", () => {
    markIntroPlayed();
    expect(hasIntroPlayed()).toBe(true);
    replayIntro();
    expect(hasIntroPlayed()).toBe(false);
  });
});
