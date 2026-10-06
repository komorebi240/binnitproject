import { describe, expect, it } from "@jest/globals";
import { House } from "@phosphor-icons/react";
import { searchFeatures, type FeatureEntry } from "./featureSearch";

const FEATURES: FeatureEntry[] = [
  { href: "/dashboard", label: "Home", icon: House, children: [{ label: "KPI tháng này", keywords: "diem" }] },
  {
    href: "/dashboard/tasks",
    label: "Công việc",
    icon: House,
    children: [
      { label: "Giao việc mới", roles: ["EXECUTIVE"] },
      { label: "Checklist trong công việc", keywords: "tick" },
    ],
  },
  { href: "/dashboard/users", label: "Nhân sự", icon: House, roles: ["EXECUTIVE"], children: [{ label: "Thêm nhân sự" }] },
];

describe("searchFeatures", () => {
  it("no query lists every visible page, collapsed", () => {
    const groups = searchFeatures("", "EMPLOYEE", FEATURES);
    expect(groups.map((g) => g.entry.label)).toEqual(["Home", "Công việc"]);
    expect(groups.every((g) => g.children.length === 0)).toBe(true);
  });

  it("a sub-feature brings its parent page first, with the sub-feature underneath", () => {
    const groups = searchFeatures("checklist", "EMPLOYEE", FEATURES);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.entry.label).toBe("Công việc");
    expect(groups[0]?.pageMatches).toBe(false);
    expect(groups[0]?.children.map((c) => c.label)).toEqual(["Checklist trong công việc"]);
  });

  it("matches without accents and through hidden keywords", () => {
    expect(searchFeatures("cong viec", "EMPLOYEE", FEATURES)[0]?.pageMatches).toBe(true);
    expect(searchFeatures("tick", "EMPLOYEE", FEATURES)[0]?.children).toHaveLength(1);
  });

  it("hides pages and sub-features the role cannot use", () => {
    expect(searchFeatures("nhan su", "EMPLOYEE", FEATURES)).toHaveLength(0);
    expect(searchFeatures("giao viec", "EMPLOYEE", FEATURES)).toHaveLength(0);
    expect(searchFeatures("giao viec", "EXECUTIVE", FEATURES)[0]?.children).toHaveLength(1);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchFeatures("zzz", "EXECUTIVE", FEATURES)).toEqual([]);
  });
});
