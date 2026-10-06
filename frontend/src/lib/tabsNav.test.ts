import { describe, expect, it } from "@jest/globals";
import { nextTabId } from "./tabsNav";

const TABS = [{ id: "a" }, { id: "b", disabled: true }, { id: "c" }, { id: "d" }];

describe("nextTabId", () => {
  it("moves right and skips a disabled tab", () => {
    expect(nextTabId(TABS, "a", "ArrowRight")).toBe("c");
  });

  it("wraps around at both ends", () => {
    expect(nextTabId(TABS, "d", "ArrowRight")).toBe("a");
    expect(nextTabId(TABS, "a", "ArrowLeft")).toBe("d");
  });

  it("treats up and down like left and right (vertical lists)", () => {
    expect(nextTabId(TABS, "c", "ArrowDown")).toBe("d");
    expect(nextTabId(TABS, "c", "ArrowUp")).toBe("a");
  });

  it("jumps to the first and last enabled tab", () => {
    expect(nextTabId(TABS, "c", "Home")).toBe("a");
    expect(nextTabId(TABS, "a", "End")).toBe("d");
  });

  it("ignores other keys and handles nothing being enabled", () => {
    expect(nextTabId(TABS, "a", "Enter")).toBeNull();
    expect(nextTabId([{ id: "x", disabled: true }], "x", "ArrowRight")).toBeNull();
  });
});
