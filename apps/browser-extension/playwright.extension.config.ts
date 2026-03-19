import { defineConfig } from "@playwright/test";

/**
 * Playwright config for testing the real Chrome extension.
 *
 * Chrome extensions require headed mode (headless: false) because
 * the extension APIs are not available in headless Chrome.
 *
 * This config runs the blocking-pipeline E2E tests that load the
 * actual extension and verify blocking works against real sites.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "blocking-pipeline.spec.ts",
  timeout: 60_000,
  retries: 1,
  fullyParallel: false, // Sequential — we share a single browser context
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
