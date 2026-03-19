import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Tests for the popup page of the browser extension.
 *
 * Since we cannot load a full extension context in Playwright, we open the
 * built popup HTML file directly. The chrome.* APIs are stubbed via a script
 * injected before the page loads.
 */

function popupPageUrl(): string {
  const htmlPath = path.resolve(__dirname, "../dist/src/popup/index.html");
  return `file://${htmlPath.replace(/\\/g, "/")}`;
}

test.describe("Popup — Inactive state", () => {
  test.beforeEach(async ({ page }) => {
    // Stub chrome.* APIs — session inactive
    await page.addInitScript(() => {
      const noop = (): void => {
        /* no-op */
      };

      (globalThis as Record<string, unknown>).chrome = {
        storage: {
          local: {
            get: (
              _keys: string | string[],
              callback: (result: Record<string, unknown>) => void,
            ) => {
              callback({});
            },
            set: (
              _items: Record<string, unknown>,
              callback?: () => void,
            ) => {
              if (callback) callback();
            },
          },
        },
        runtime: {
          sendMessage: (
            _msg: unknown,
            callback?: (response: unknown) => void,
          ) => {
            const response = {
              isActive: false,
              sessionId: null,
              blockedDomains: [],
              startedAt: null,
              endTime: null,
              distractionCount: 0,
            };
            if (callback) {
              callback(response);
            }
            return Promise.resolve(response);
          },
          lastError: null,
        },
        tabs: { update: noop },
      };
    });
  });

  test("should render the popup header with Focus Shield title", async ({
    page,
  }) => {
    await page.goto(popupPageUrl());

    await expect(
      page.locator("text=Focus Shield").first(),
    ).toBeVisible();
  });

  test("should show inactive status badge", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(page.locator("text=Inactive")).toBeVisible();
  });

  test("should show quick start presets when inactive", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(page.locator("text=Quick Start")).toBeVisible();
    await expect(page.locator("text=Pomodoro 25min")).toBeVisible();
    await expect(page.locator("text=Deep Work 90min")).toBeVisible();
    await expect(page.locator("text=Quick Focus 15min")).toBeVisible();
  });

  test("should display the footer with version", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(page.locator("text=Focus Shield v0.1.0")).toBeVisible();
  });
});

test.describe("Popup — Active state", () => {
  test.beforeEach(async ({ page }) => {
    // Stub chrome.* APIs — session active
    await page.addInitScript(() => {
      const noop = (): void => {
        /* no-op */
      };

      (globalThis as Record<string, unknown>).chrome = {
        storage: {
          local: {
            get: (
              _keys: string | string[],
              callback: (result: Record<string, unknown>) => void,
            ) => {
              callback({});
            },
            set: (
              _items: Record<string, unknown>,
              callback?: () => void,
            ) => {
              if (callback) callback();
            },
          },
        },
        runtime: {
          sendMessage: (
            _msg: unknown,
            callback?: (response: unknown) => void,
          ) => {
            const response = {
              isActive: true,
              sessionId: "test-session-1",
              blockedDomains: ["*.reddit.com"],
              startedAt: new Date().toISOString(),
              endTime: new Date(
                Date.now() + 25 * 60_000,
              ).toISOString(),
              distractionCount: 3,
            };
            if (callback) {
              callback(response);
            }
            return Promise.resolve(response);
          },
          lastError: null,
        },
        tabs: { update: noop },
      };
    });
  });

  test("should show active status badge", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(page.locator("text=Active")).toBeVisible();
  });

  test("should show stop session button when active", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(
      page.locator("button", { hasText: "Stop Session" }),
    ).toBeVisible();
  });

  test("should show distraction count when active", async ({ page }) => {
    await page.goto(popupPageUrl());

    await expect(page.locator("text=Distractions blocked:")).toBeVisible();
  });
});
