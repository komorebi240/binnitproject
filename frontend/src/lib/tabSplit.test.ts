import { describe, expect, it } from "@jest/globals";
import { addInSplit, closeInSplit, moveToSide, normalizeSplit, paneIds, selectInSplit, startSplit, type SplitState, type SplitTab } from "./tabSplit";

const tab = (id: string, side?: "left" | "right"): SplitTab => ({ id, side });

function split(): SplitState<SplitTab> {
  // Left half: a, b (a shown). Right half: c, d (c shown), focus on the left.
  return {
    tabs: [tab("a", "left"), tab("c", "right"), tab("b", "left"), tab("d", "right")],
    activeTabId: "a",
    splitTabId: "c",
    activeOnLeft: true,
  };
}

describe("tabSplit", () => {
  it("startSplit puts only the partner on the right", () => {
    const next = startSplit({ tabs: [tab("a"), tab("b"), tab("c")], activeTabId: "a", splitTabId: null, activeOnLeft: true }, "b");
    expect(next.tabs.map((t) => t.side)).toEqual(["left", "right", "left"]);
    expect(paneIds(next)).toEqual({ left: "a", right: "b" });
  });

  it("selecting a tab shows it in its own half without moving it", () => {
    const next = selectInSplit(split(), "d");
    expect(paneIds(next)).toEqual({ left: "a", right: "d" });
    expect(next.activeTabId).toBe("d");
    expect(next.tabs).toEqual(split().tabs);
  });

  it("selecting a left tab keeps the right pane as it was", () => {
    const next = selectInSplit(split(), "b");
    expect(paneIds(next)).toEqual({ left: "b", right: "c" });
    expect(next.activeOnLeft).toBe(true);
  });

  it("a new tab opens in the requested half", () => {
    const next = addInSplit(split(), tab("n"), "right");
    expect(paneIds(next)).toEqual({ left: "a", right: "n" });
    expect(next.tabs.find((t) => t.id === "n")?.side).toBe("right");
  });

  it("moving a tab changes its half and shows it there", () => {
    const next = moveToSide(split(), "b", "right");
    expect(next.tabs.find((t) => t.id === "b")?.side).toBe("right");
    expect(paneIds(next)).toEqual({ left: "a", right: "b" });
  });

  it("moving the shown tab lets a sibling take over the old half", () => {
    const next = moveToSide(split(), "a", "right");
    expect(paneIds(next)).toEqual({ left: "b", right: "a" });
  });

  it("the last tab of a half cannot move away", () => {
    const state = { ...split(), tabs: [tab("a", "left"), tab("c", "right"), tab("d", "right")] };
    expect(moveToSide(state, "a", "right")).toBe(state);
  });

  it("closing a shown tab shows its neighbour of the same half", () => {
    const next = closeInSplit(split(), "c");
    expect(next && paneIds(next)).toEqual({ left: "a", right: "d" });
  });

  it("closing a background tab changes nothing else", () => {
    const next = closeInSplit(split(), "b");
    expect(next && paneIds(next)).toEqual({ left: "a", right: "c" });
    expect(next?.tabs.map((t) => t.id)).toEqual(["a", "c", "d"]);
  });

  it("closing the last tab of a half ends the split", () => {
    const state = { ...split(), tabs: [tab("a", "left"), tab("c", "right"), tab("b", "left")] };
    const next = closeInSplit(state, "c");
    expect(next?.splitTabId).toBeNull();
    expect(next?.activeTabId).toBe("a");
  });

  it("normalizeSplit repairs sides from the shown tabs and defaults to left", () => {
    const next = normalizeSplit({ tabs: [tab("a"), tab("b"), tab("c")], activeTabId: "a", splitTabId: "c", activeOnLeft: true });
    expect(next.tabs.map((t) => t.side)).toEqual(["left", "left", "right"]);
  });
});
