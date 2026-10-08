import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { EN } from "./en";
import { interpolate, translate } from "./translate";
import { VI } from "./vi";

const VIETNAMESE_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const PLACEHOLDER = /\{(\w+)\}/g;

const viEntries = Object.entries(VI as Record<string, string>);
const enMessages = EN as Record<string, string>;
const viMessages = VI as Record<string, string>;

function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1] as string).sort();
}

describe("interpolate", () => {
  it("fills every placeholder and leaves an unknown one visible", () => {
    expect(interpolate("Hello {name}, you have {count} tasks", { name: "An", count: 3 })).toBe("Hello An, you have 3 tasks");
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
    expect(interpolate("No params")).toBe("No params");
  });
});

describe("translate", () => {
  const messages = { "a.b": "B", "a.items_one": "{count} item", "a.items_other": "{count} items", "a.only_other": "{count} things" };
  const fallback = { "a.b": "B-fallback", "a.c": "C-fallback" };

  it("uses the language's own text, then the fallback language, then the key", () => {
    expect(translate("en", messages, fallback, "a.b")).toBe("B");
    expect(translate("en", messages, fallback, "a.c")).toBe("C-fallback");
    expect(translate("en", messages, fallback, "a.missing")).toBe("a.missing");
  });

  it("picks the plural form of the language for params.count", () => {
    expect(translate("en", messages, fallback, "a.items", { count: 1 })).toBe("1 item");
    expect(translate("en", messages, fallback, "a.items", { count: 2 })).toBe("2 items");
    expect(translate("en", messages, fallback, "a.items", { count: 0 })).toBe("0 items");
  });

  it("falls back to the 'other' form when the exact form is missing, and uses a plain key when there are no forms", () => {
    expect(translate("en", messages, fallback, "a.only", { count: 1 })).toBe("1 things");
    expect(translate("en", messages, fallback, "a.b", { count: 5 })).toBe("B");
  });

  it("Vietnamese has a single plural form", () => {
    const vi = { "a.items_one": "{count} mục", "a.items_other": "{count} mục" };
    expect(translate("vi", vi, vi, "a.items", { count: 1 })).toBe("1 mục");
    expect(translate("vi", vi, vi, "a.items", { count: 7 })).toBe("7 mục");
  });
});

describe("dictionaries", () => {
  it("English has exactly the keys of Vietnamese", () => {
    expect(Object.keys(enMessages).sort()).toEqual(Object.keys(viMessages).sort());
  });

  // Texts whose languages name the same value differently; the caller passes both (see CalendarView).
  const OWN_PLACEHOLDERS = new Set(["calendar.calendarView.monthYear"]);

  it.each(viEntries.filter(([key]) => !OWN_PLACEHOLDERS.has(key)))("%s uses the same placeholders in both languages", (key, vi) => {
    expect(placeholdersOf(enMessages[key] as string)).toEqual(placeholdersOf(vi));
  });

  it("no English text contains a Vietnamese letter, and none is a copy of a Vietnamese text", () => {
    const leftovers = viEntries.filter(([key]) => VIETNAMESE_LETTER.test(enMessages[key] as string)).map(([key]) => key);
    expect(leftovers).toEqual([]);
    const untranslated = viEntries.filter(([key, vi]) => VIETNAMESE_LETTER.test(vi) && enMessages[key] === vi).map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  it("no text is empty", () => {
    expect(viEntries.filter(([, vi]) => vi.trim() === "").map(([key]) => key)).toEqual([]);
    expect(Object.entries(enMessages).filter(([, en]) => en.trim() === "").map(([key]) => key)).toEqual([]);
  });

  it("every plural form has its 'other' form in both languages", () => {
    for (const messages of [viMessages, enMessages]) {
      const missing = Object.keys(messages)
        .filter((key) => /_(one|zero|two|few|many)$/.test(key))
        .filter((key) => !(`${key.replace(/_[a-z]+$/, "")}_other` in messages));
      expect(missing).toEqual([]);
    }
  });
});

describe("message keys in the source", () => {
  const SRC = path.resolve(__dirname, "..", "..");

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  }

  it("every message of the dictionary is used somewhere, so a removed screen does not leave its texts behind", () => {
    const dictionaryDir = path.join(SRC, "lib", "i18n");
    const source = sourceFiles(SRC)
      .filter((file) => !file.startsWith(path.join(dictionaryDir, "vi")) && !file.startsWith(path.join(dictionaryDir, "en")))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    const unused = Object.keys(viMessages).filter((key) => {
      const base = key.replace(/_(one|other|zero|two|few|many)$/, "");
      return !source.includes(`"${key}"`) && !source.includes(`"${base}"`);
    });
    expect(unused).toEqual([]);
  });
});
