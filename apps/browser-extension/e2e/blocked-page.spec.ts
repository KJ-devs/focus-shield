import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Tests for the blocked page of the browser extension.
 *
 * Since we cannot load a full extension context in Playwright, we open the
 * built blocked page HTML file directly. The chrome.* APIs are stubbed via
 * a script injected before the page loads.
 */

function blockedPageUrl(): string {
  const htmlPath = path.resolve(
    __dirname,
    "../dist/src/blocked/index.html",
  );
  return `file://${htmlPath.replace(/\\/g, "/")}`;
}

test.describe("Blocked Page", () => {
  test.beforeEach(async ({ page }) => {
    // Stub chrome.* APIs so the page can render without the extension runtime
    await page.addInitScript(() => {
      const noop = (): void => {
        /* no-op */
      };

      interface StorageArea {
        get: (
          keys: string | string[],
          callback: (result: Record<string, unknown>) => void,
        ) => void;
        set: (items: Record<string, unknown>, callback?: () => void) => void;
      }

      const storageArea: StorageArea = {
        get: (
          _keys: string | string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({
            focusShield_blockingState: {
              isActive: true,
              endTime: new Date(Date.now() + 25 * 60_000).toISOString(),
              distractionCount: 7,
            },
          });
        },
        set: (_items: Record<string, unknown>, callback?: () => void) => {
          if (callback) callback();
        },
      };

      (globalThis as Record<string, unknown>).chrome = {
        storage: { local: storageArea },
        tabs: { update: noop },
        runtime: { lastError: null },
      };
    });
  });

  test("should render the blocked page with shield icon and heading", async ({
    page,
  }) => {
    await page.goto(blockedPageUrl());

    await expect(page.locator("h1", { hasText: "Site Blocked" })).toBeVisible();
  });

  test("should display a motivational quote", async ({ page }) => {
    await page.goto(blockedPageUrl());

    // The quote container should have at least one quote author
    const quoteAuthor = page.locator("text=--");
    await expect(quoteAuthor.first()).toBeVisible();
  });

  test("should display the time remaining", async ({ page }) => {
    await page.goto(blockedPageUrl());

    await expect(page.locator("text=Time Remaining")).toBeVisible();
  });

  test("should display the distraction counter", async ({ page }) => {
    await page.goto(blockedPageUrl());

    await expect(page.locator("text=Sites Blocked")).toBeVisible();
    // The mock state has 7 distractions
    await expect(page.locator("text=7")).toBeVisible();
  });

  test("should display the Back to Work button", async ({ page }) => {
    await page.goto(blockedPageUrl());

    const button = page.locator("button", { hasText: "Back to Work" });
    await expect(button).toBeVisible();
  });
});
