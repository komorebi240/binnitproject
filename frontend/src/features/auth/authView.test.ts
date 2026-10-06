import { describe, expect, it } from "@jest/globals";
import { centerOffset, parseAuthView } from "./authView";

describe("parseAuthView", () => {
  it("accepts the two known windows", () => {
    expect(parseAuthView("login")).toBe("login");
    expect(parseAuthView("register")).toBe("register");
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(parseAuthView(["login", "register"])).toBe("login");
  });

  it("ignores anything else", () => {
    expect(parseAuthView(undefined)).toBeNull();
    expect(parseAuthView("admin")).toBeNull();
    expect(parseAuthView("")).toBeNull();
  });
});

describe("centerOffset", () => {
  it("is positive for an element above the middle of the window and negative below it", () => {
    expect(centerOffset({ top: 100, height: 80 }, 800)).toBe(260);
    expect(centerOffset({ top: 600, height: 80 }, 800)).toBe(-240);
  });

  it("is zero for an element already centred", () => {
    expect(centerOffset({ top: 360, height: 80 }, 800)).toBe(0);
  });
});
