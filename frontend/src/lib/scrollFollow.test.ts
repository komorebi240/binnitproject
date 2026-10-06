import { describe, expect, it } from "@jest/globals";
import { followAction, isNearBottom } from "./scrollFollow";

describe("isNearBottom", () => {
  it("is true at the very bottom and within the threshold", () => {
    expect(isNearBottom({ scrollTop: 500, clientHeight: 500, scrollHeight: 1000 })).toBe(true);
    expect(isNearBottom({ scrollTop: 430, clientHeight: 500, scrollHeight: 1000 })).toBe(true);
  });

  it("is false when scrolled up to read older lines", () => {
    expect(isNearBottom({ scrollTop: 100, clientHeight: 500, scrollHeight: 1000 })).toBe(false);
  });

  it("is true when everything fits without scrolling", () => {
    expect(isNearBottom({ scrollTop: 0, clientHeight: 500, scrollHeight: 300 })).toBe(true);
  });
});

describe("followAction", () => {
  const base = { firstContent: false, atBottom: true, ownLatest: false, changed: true };

  it("follows new lines while the reader is at the bottom", () => {
    expect(followAction(base)).toBe("scroll");
  });

  it("does not drag a reader who scrolled up, and offers the jump button", () => {
    expect(followAction({ ...base, atBottom: false })).toBe("offer-jump");
  });

  it("always scrolls to the first content and to what the person just sent", () => {
    expect(followAction({ ...base, atBottom: false, firstContent: true })).toBe("scroll");
    expect(followAction({ ...base, atBottom: false, ownLatest: true })).toBe("scroll");
  });

  it("does nothing when nothing changed", () => {
    expect(followAction({ ...base, atBottom: false, changed: false })).toBe("none");
  });
});
