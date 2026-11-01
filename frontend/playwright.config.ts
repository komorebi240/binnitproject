import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Dedicated frontend build and port: no backend, real credentials or existing server reuse.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  globalTimeout: 420_000,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: "../.artifacts/playwright/results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "../.artifacts/playwright/report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    locale: "vi-VN",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    cwd: path.resolve(__dirname),
    url: "http://127.0.0.1:3100/login?open=login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
      BACKEND_ORIGIN: "http://127.0.0.1:9",
    },
  },
});
