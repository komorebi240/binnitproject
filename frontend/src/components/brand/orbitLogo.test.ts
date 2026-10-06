import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import { LOGO, LOGO_ASPECT, logoHeightFor } from "./orbitLogo";

const MIN_LETTER_GAP = 3; // units of the logo grid: closer than this and the capitals start to touch at small sizes

describe("logo geometry", () => {
  it("spells ORBIT with one letter box per capital, in order, left to right", () => {
    expect(LOGO.letters.map((l) => l.char).join("")).toBe(LOGO.text.word);
    for (let i = 1; i < LOGO.letters.length; i++) {
      const previous = LOGO.letters[i - 1]!;
      const gap = LOGO.letters[i]!.x - (previous.x + previous.width);
      expect(gap).toBeGreaterThanOrEqual(MIN_LETTER_GAP);
    }
  });

  it("keeps the whole logo inside its box", () => {
    const last = LOGO.letters[LOGO.letters.length - 1]!;
    expect(last.x + last.width).toBeCloseTo(LOGO.width, 1);
    for (const letter of LOGO.letters) {
      expect(letter.y).toBeGreaterThanOrEqual(-0.01);
      expect(letter.y + letter.height).toBeLessThanOrEqual(LOGO.height + 0.01);
    }
    const { planet, satellite } = LOGO;
    expect(planet.cx - planet.r).toBeGreaterThanOrEqual(-0.01);
    expect(planet.cy - planet.r).toBeGreaterThanOrEqual(-0.01);
    expect(planet.cy + planet.r).toBeLessThanOrEqual(LOGO.height + 0.01);
    expect(satellite.cy - satellite.r).toBeGreaterThanOrEqual(-0.01);
  });

  it("centres the capitals on the planet", () => {
    for (const letter of LOGO.letters) {
      expect(letter.y + letter.height / 2).toBeCloseTo(LOGO.planet.cy, 1);
    }
  });

  it("leaves a clear gap between the mark and the word", () => {
    const markRight = LOGO.ring.cx + LOGO.ring.rx * Math.cos((LOGO.ring.tilt * Math.PI) / 180) + LOGO.ring.strokeWidth / 2;
    expect(LOGO.letters[0]!.x - markRight).toBeGreaterThan(LOGO.text.capHeight / 2);
  });

  it("keeps the satellite clear of the planet, with room for the knock-out", () => {
    const { planet, satellite, gap } = LOGO;
    const distance = Math.hypot(satellite.cx - planet.cx, satellite.cy - planet.cy);
    expect(distance).toBeGreaterThan(planet.r + satellite.r + gap);
  });

  it("gives the right height for a width without stretching", () => {
    expect(logoHeightFor(180)).toBeCloseTo(LOGO.height, 1);
    expect(logoHeightFor(360) / 360).toBeCloseTo(1 / LOGO_ASPECT, 3);
  });
});

describe("master files in public/brand", () => {
  const read = (name: string) => readFileSync(join(process.cwd(), "public", "brand", name), "utf8");

  it.each(["orbit-logo.svg", "orbit-logo-reversed.svg", "orbit-logo-black.svg", "orbit-logo-white.svg"])(
    "%s is drawn from the same numbers as the React logo",
    (name) => {
      const svg = read(name);
      expect(svg).toContain(`viewBox="0 0 ${LOGO.width} ${LOGO.height}"`);
      for (const letter of LOGO.letters) expect(svg).toContain(`d="${letter.d}"`);
      expect(svg).toContain(`d="${LOGO.ring.front}"`);
      expect(svg).toContain(`r="${LOGO.planet.r}"`);
    },
  );

  it("has no text elements, so no font is needed to render a master file", () => {
    for (const name of ["orbit-logo.svg", "orbit-logo-reversed.svg", "orbit-logo-black.svg", "orbit-logo-white.svg", "orbit-mark.svg", "orbit-app-icon.svg"]) {
      expect(read(name)).not.toMatch(/<text[\s>]/);
    }
  });
});
