import { describe, expect, it } from "@jest/globals";
import { House } from "@phosphor-icons/react";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { EN } from "@/lib/i18n/en";
import { translate } from "@/lib/i18n/translate";
import { VI } from "@/lib/i18n/vi";
import { searchFeatures, type FeatureEntry } from "./featureSearch";

const FEATURES: FeatureEntry[] = [
  { href: "/dashboard", labelKey: "layout.sidebar.home", icon: House, children: [{ labelKey: "common.thisMonthSKpi", keywords: "diem" }] },
  {
    href: "/dashboard/tasks",
    labelKey: "common.tasks",
    icon: House,
    children: [
      { labelKey: "common.assignANewTask", roles: ["EXECUTIVE"] },
      { labelKey: "layout.featureSearch.checklistInATask", keywords: "tick" },
    ],
  },
  { href: "/dashboard/users", labelKey: "common.staff", icon: House, roles: ["EXECUTIVE"], children: [{ labelKey: "common.addStaff" }] },
];

const inVietnamese = (key: TranslationKey) => translate("vi", VI, VI, key);
const inEnglish = (key: TranslationKey) => translate("en", EN, VI, key);

describe("searchFeatures", () => {
  it("no query lists every visible page, collapsed", () => {
    const groups = searchFeatures("", "EMPLOYEE", inVietnamese, FEATURES);
    expect(groups.map((g) => g.entry.labelKey)).toEqual(["layout.sidebar.home", "common.tasks"]);
    expect(groups.every((g) => g.children.length === 0)).toBe(true);
  });

  it("a sub-feature brings its parent page first, with the sub-feature underneath", () => {
    const groups = searchFeatures("checklist", "EMPLOYEE", inVietnamese, FEATURES);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.entry.labelKey).toBe("common.tasks");
    expect(groups[0]?.pageMatches).toBe(false);
    expect(groups[0]?.children.map((c) => c.labelKey)).toEqual(["layout.featureSearch.checklistInATask"]);
  });

  it("matches without accents and through hidden keywords", () => {
    expect(searchFeatures("cong viec", "EMPLOYEE", inVietnamese, FEATURES)[0]?.pageMatches).toBe(true);
    expect(searchFeatures("tick", "EMPLOYEE", inVietnamese, FEATURES)[0]?.children).toHaveLength(1);
  });

  it("hides pages and sub-features the role cannot use", () => {
    expect(searchFeatures("nhan su", "EMPLOYEE", inVietnamese, FEATURES)).toHaveLength(0);
    expect(searchFeatures("giao viec", "EMPLOYEE", inVietnamese, FEATURES)).toHaveLength(0);
    expect(searchFeatures("giao viec", "EXECUTIVE", inVietnamese, FEATURES)[0]?.children).toHaveLength(1);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchFeatures("zzz", "EXECUTIVE", inVietnamese, FEATURES)).toEqual([]);
  });

  it("matches the names in the language of the translator", () => {
    expect(searchFeatures("tasks", "EMPLOYEE", inEnglish, FEATURES)[0]?.pageMatches).toBe(true);
    expect(searchFeatures("tasks", "EMPLOYEE", inVietnamese, FEATURES)).toHaveLength(0);
    expect(searchFeatures("assign a new task", "EXECUTIVE", inEnglish, FEATURES)[0]?.children).toHaveLength(1);
  });
});
