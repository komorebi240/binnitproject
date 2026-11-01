import nextJest from "next/jest.js";

// next/jest wires up SWC (TypeScript/JSX) and the Next.js config, so no extra transform packages are needed.
const createJestConfig = nextJest({ dir: "./" });

/** Logic tests stay in Node; component files opt into jsdom through a file annotation. */
export default createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
