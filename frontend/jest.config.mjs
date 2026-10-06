import nextJest from "next/jest.js";

// next/jest wires up SWC (TypeScript/JSX) and the Next.js config, so no extra transform packages are needed.
const createJestConfig = nextJest({ dir: "./" });

/** Unit tests cover pure logic (geometry, animation timeline). They run in plain Node, no DOM. */
export default createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
