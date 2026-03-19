import { defineConfig } from "@playwright/test";

/**
 * Playwright config for multi-browser extension testing.
 *
 * Tests the Focus Shield extension across all installed Chromium-based
 * browsers (Chrome, Brave, Edge, Opera) and Firefox.
 *
 * Extensions require headed mode (headless: false).
 * Tests run sequentially (shared browser contexts per browser).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "multi-browser-blocking.spec.ts",
  timeout: 90_000,
  retries: 1,
  fullyParallel: false,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
