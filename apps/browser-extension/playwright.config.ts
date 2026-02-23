import { defineConfig } from "@playwright/test";

/**
 * Playwright config for the browser extension.
 *
 * The extension pages (blocked page, popup) are built as standalone HTML files.
 * We serve the dist/ directory and test the rendered output directly, without
 * loading the full extension context (chrome.* APIs are not available in
 * Playwright). The tests validate that the UI renders correctly.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  fullyParallel: true,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
