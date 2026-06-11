import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Run:  npm run test:e2e      → headless
 *       npm run test:e2e:ui   → opens browser UI
 *
 * Tests live in:  src/test/e2e/
 */
export default defineConfig({
  testDir: "./src/test/e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if tests are accidentally left with .only
  forbidOnly: !!process.env.CI,

  // Retry once on CI, never locally
  retries: process.env.CI ? 1 : 0,

  // 2 parallel workers on CI, use default locally
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    // Base URL — all page() calls resolve relative to this
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",

    // Capture screenshot and video only on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Trace on first retry
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 14"] },
    },
  ],

  // Start Next.js dev server automatically before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
