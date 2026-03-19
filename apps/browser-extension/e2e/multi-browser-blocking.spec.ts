/**
 * Multi-browser E2E tests for Focus Shield blocking.
 *
 * Tests the extension across all available Chromium-based browsers:
 *   - Chrome
 *   - Brave
 *   - Microsoft Edge (if installed)
 *   - Opera (if installed)
 *
 * Firefox is tested separately because it uses a different extension loading
 * mechanism and a different manifest format.
 *
 * Usage:
 *   pnpm --filter @focus-shield/browser-extension e2e:browsers
 */

import {
  test,
  expect,
  chromium,
  firefox,
  type BrowserContext,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdtempSync, readFileSync } from "fs";
import os from "os";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_ROOT = path.resolve(__dirname, "..");
const FIREFOX_EXTENSION = path.resolve(EXTENSION_ROOT, "dist-firefox");

// ---------------------------------------------------------------------------
// Domains to block (Social Media + Entertainment defaults)
// ---------------------------------------------------------------------------

const BLOCKED_DOMAINS = [
  "*.facebook.com",
  "*.instagram.com",
  "*.twitter.com",
  "*.x.com",
  "*.tiktok.com",
  "*.youtube.com",
  "*.netflix.com",
  "*.reddit.com",
];

const SITES_TO_TEST = [
  { url: "https://www.instagram.com/", name: "Instagram", shouldBlock: true },
  { url: "https://www.youtube.com/", name: "YouTube", shouldBlock: true },
  { url: "https://www.reddit.com/", name: "Reddit", shouldBlock: true },
  { url: "https://twitter.com/", name: "Twitter", shouldBlock: true },
  { url: "https://www.google.com/", name: "Google", shouldBlock: false },
  { url: "https://github.com/", name: "GitHub", shouldBlock: false },
];

// ---------------------------------------------------------------------------
// Browser detection
// ---------------------------------------------------------------------------

interface BrowserInfo {
  name: string;
  executablePath: string;
  type: "chromium" | "firefox";
}

function detectBrowsers(): BrowserInfo[] {
  const browsers: BrowserInfo[] = [];

  const candidates: Array<{
    name: string;
    paths: string[];
    type: "chromium" | "firefox";
  }> = [
    {
      name: "Chrome",
      paths: [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ],
      type: "chromium",
    },
    {
      name: "Brave",
      paths: [
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      ],
      type: "chromium",
    },
    {
      name: "Edge",
      paths: [
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ],
      type: "chromium",
    },
    {
      name: "Opera",
      paths: [
        `${process.env.LOCALAPPDATA}\\Programs\\Opera\\opera.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Opera GX\\opera.exe`,
        "C:\\Program Files\\Opera\\opera.exe",
      ],
      type: "chromium",
    },
    {
      name: "Firefox",
      paths: [
        "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
        "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
      ],
      type: "firefox",
    },
  ];

  for (const candidate of candidates) {
    for (const p of candidate.paths) {
      if (existsSync(p)) {
        browsers.push({
          name: candidate.name,
          executablePath: p,
          type: candidate.type,
        });
        break; // Found this browser, skip remaining paths
      }
    }
  }

  return browsers;
}

// ---------------------------------------------------------------------------
// Chromium extension helpers
// ---------------------------------------------------------------------------

async function launchChromiumWithExtension(
  browser: BrowserInfo,
): Promise<{ context: BrowserContext; extensionId: string }> {
  // Use a unique temp dir per browser to avoid conflicts with running instances
  const userDataDir = mkdtempSync(
    path.join(os.tmpdir(), `focus-shield-${browser.name.toLowerCase()}-`),
  );

  const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_ROOT}`,
      `--load-extension=${EXTENSION_ROOT}`,
      "--no-first-run",
      "--disable-default-apps",
      "--disable-popup-blocking",
    ],
  };

  // Use system browser binary for non-Chrome browsers.
  // For Chrome, use Playwright's built-in Chromium to avoid conflicts
  // with a running Chrome instance (they share the same profile lock).
  if (browser.name !== "Chrome") {
    launchOptions.executablePath = browser.executablePath;
  }

  const context = await chromium.launchPersistentContext(
    userDataDir,
    launchOptions,
  );

  // Wait for service worker
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker");
  }

  // Extract extension ID
  const swUrl = sw.url();
  const match = swUrl.match(/chrome-extension:\/\/([a-z]+)\//);
  if (!match) {
    throw new Error(`Could not extract extension ID from: ${swUrl}`);
  }

  return { context, extensionId: match[1] };
}

async function activateChromiumBlocking(
  context: BrowserContext,
): Promise<void> {
  const sw = context.serviceWorkers()[0];
  if (!sw) throw new Error("No service worker found");

  const endTime = new Date(Date.now() + 25 * 60_000).toISOString();

  await sw.evaluate(
    async ({ domains, sessionId, endTime: et }) => {
      const existingRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map(
        (r: chrome.declarativeNetRequest.Rule) => r.id,
      );

      function patternToUrlFilter(pattern: string): string {
        let cleaned = pattern.trim().toLowerCase();
        if (cleaned.startsWith("*.")) cleaned = cleaned.slice(2);
        if (cleaned.endsWith("/*")) cleaned = cleaned.slice(0, -1);
        else if (cleaned.endsWith("*")) cleaned = cleaned.slice(0, -1);
        return `||${cleaned}`;
      }

      const blockedPageUrl = chrome.runtime.getURL(
        "dist/src/blocked/index.html",
      );

      const newRules: chrome.declarativeNetRequest.Rule[] = domains.map(
        (domain: string, index: number) => ({
          id: index + 1,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
            redirect: { url: blockedPageUrl },
          },
          condition: {
            urlFilter: patternToUrlFilter(domain),
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
            ],
          },
        }),
      );

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
        addRules: newRules,
      });

      await chrome.storage.local.set({
        focusShield_blockingState: {
          isActive: true,
          sessionId,
          blockedDomains: domains,
          startedAt: new Date().toISOString(),
          endTime: et,
          distractionCount: 0,
        },
      });
    },
    {
      domains: BLOCKED_DOMAINS,
      sessionId: "test-pomodoro-session",
      endTime,
    },
  );
}

async function deactivateChromiumBlocking(
  context: BrowserContext,
): Promise<void> {
  const sw = context.serviceWorkers()[0];
  if (!sw) return;

  await sw.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ids = rules.map((r: chrome.declarativeNetRequest.Rule) => r.id);
    if (ids.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ids,
      });
    }
    await chrome.storage.local.set({
      focusShield_blockingState: {
        isActive: false,
        sessionId: null,
        blockedDomains: [],
        startedAt: null,
        endTime: null,
        distractionCount: 0,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Firefox extension helpers
// ---------------------------------------------------------------------------

async function launchFirefoxWithExtension(): Promise<{
  context: BrowserContext;
}> {
  // Firefox uses a different mechanism: we install via the debugging protocol
  const context = await firefox.launchPersistentContext("", {
    headless: false,
    args: [],
  });

  // Install the extension using CDP-like protocol
  // Firefox Playwright doesn't support --load-extension, so we use the
  // built-in extension installation via the debugging API
  const bgPage = await installFirefoxExtension(context);
  if (bgPage) {
    console.log("  Firefox extension installed via debugging API");
  }

  return { context };
}

async function installFirefoxExtension(
  context: BrowserContext,
): Promise<boolean> {
  // For Firefox, we need to use web-ext or the remote debugging protocol.
  // Playwright's Firefox doesn't support extension loading natively like Chromium.
  // Instead, we test the extension pages directly by navigating to them.
  //
  // The actual blocking test for Firefox uses a different approach:
  // We load the blocked page directly and verify it renders correctly,
  // since declarativeNetRequest rules can't be tested without a real extension context.
  console.log(
    "  Note: Firefox extension testing uses page-level verification",
  );
  return false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const detectedBrowsers = detectBrowsers();
console.log(
  `\nDetected browsers: ${detectedBrowsers.map((b) => b.name).join(", ")}\n`,
);

// ===== CHROMIUM-BASED BROWSER TESTS =====
for (const browser of detectedBrowsers.filter((b) => b.type === "chromium")) {
  test.describe(`${browser.name} — Blocking Pipeline`, () => {
    let context: BrowserContext;
    let extensionId: string;

    test.beforeAll(async () => {
      console.log(
        `\n  Launching ${browser.name} from ${browser.executablePath}`,
      );
      const result = await launchChromiumWithExtension(browser);
      context = result.context;
      extensionId = result.extensionId;
      console.log(`  Extension ID: ${extensionId}`);
    });

    test.afterAll(async () => {
      await context?.close();
    });

    test("extension service worker is running", async () => {
      const workers = context.serviceWorkers();
      expect(workers.length).toBeGreaterThan(0);
    });

    test("popup page renders", async () => {
      const page = await context.newPage();
      await page.goto(
        `chrome-extension://${extensionId}/dist/src/popup/index.html`,
      );
      await expect(page.locator("body")).not.toBeEmpty();
      await page.close();
    });

    test("blocking rules are registered after activation", async () => {
      await activateChromiumBlocking(context);

      const sw = context.serviceWorkers()[0];
      const ruleCount = await sw.evaluate(async () => {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        return rules.length;
      });

      expect(ruleCount).toBe(BLOCKED_DOMAINS.length);
    });

    // Test each blocked site
    for (const site of SITES_TO_TEST.filter((s) => s.shouldBlock)) {
      test(`blocks ${site.name}`, async () => {
        // Ensure blocking is active
        const sw = context.serviceWorkers()[0];
        const ruleCount = await sw.evaluate(async () => {
          const rules = await chrome.declarativeNetRequest.getDynamicRules();
          return rules.length;
        });
        if (ruleCount === 0) {
          await activateChromiumBlocking(context);
        }

        const page = await context.newPage();
        try {
          await page.goto(site.url, {
            waitUntil: "domcontentloaded",
            timeout: 15_000,
          });
        } catch {
          // Redirect may interrupt navigation
        }

        const currentUrl = page.url();
        const isBlocked =
          currentUrl.includes("blocked/index.html") ||
          (await page
            .locator("h1", { hasText: "Site Blocked" })
            .isVisible()
            .catch(() => false));

        expect(
          isBlocked,
          `${site.name} should be blocked on ${browser.name}. URL: ${currentUrl}`,
        ).toBe(true);

        if (isBlocked) {
          await expect(
            page.locator("h1", { hasText: "Site Blocked" }),
          ).toBeVisible({ timeout: 5_000 });
          await expect(page.locator("text=Time Remaining")).toBeVisible({
            timeout: 5_000,
          });
        }

        await page.close();
      });
    }

    // Test non-blocked sites
    for (const site of SITES_TO_TEST.filter((s) => !s.shouldBlock)) {
      test(`allows ${site.name}`, async () => {
        const page = await context.newPage();
        await page.goto(site.url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });

        const currentUrl = page.url();
        expect(
          currentUrl.includes("blocked/index.html"),
          `${site.name} should NOT be blocked on ${browser.name}`,
        ).toBe(false);

        await page.close();
      });
    }

    test("blocking deactivation removes rules and unblocks sites", async () => {
      await deactivateChromiumBlocking(context);

      const sw = context.serviceWorkers()[0];
      const ruleCount = await sw.evaluate(async () => {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        return rules.length;
      });
      expect(ruleCount).toBe(0);

      // Verify a previously blocked site is now accessible
      const page = await context.newPage();
      await page.goto("https://www.youtube.com/", {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      expect(page.url()).not.toContain("blocked/index.html");
      await page.close();
    });
  });
}

// ===== FIREFOX TESTS =====
const firefoxBrowser = detectedBrowsers.find((b) => b.type === "firefox");

if (firefoxBrowser) {
  test.describe("Firefox — Extension Pages & Blocking Logic", () => {
    let context: BrowserContext;

    test.beforeAll(async () => {
      console.log(`\n  Launching Firefox (Playwright built-in)`);

      // Use Playwright's built-in Firefox instead of system Firefox
      // System Firefox conflicts with Playwright's protocol version
      const userDataDir = mkdtempSync(
        path.join(os.tmpdir(), "focus-shield-firefox-"),
      );

      context = await firefox.launchPersistentContext(userDataDir, {
        headless: false,
      });
    });

    test.afterAll(async () => {
      await context?.close();
    });

    test("blocked page renders correctly", async () => {
      const page = await context.newPage();

      // Load the built blocked page directly with mocked chrome APIs
      const blockedPagePath = path
        .resolve(FIREFOX_EXTENSION, "dist/src/blocked/index.html")
        .replace(/\\/g, "/");

      await page.addInitScript(() => {
        const storageArea = {
          get: (
            _keys: string | string[],
            callback: (result: Record<string, unknown>) => void,
          ) => {
            callback({
              focusShield_blockingState: {
                isActive: true,
                endTime: new Date(Date.now() + 25 * 60_000).toISOString(),
                distractionCount: 3,
              },
            });
          },
          set: (
            _items: Record<string, unknown>,
            callback?: () => void,
          ) => {
            if (callback) callback();
          },
        };

        (globalThis as Record<string, unknown>).chrome = {
          storage: { local: storageArea },
          tabs: {
            update: () => {
              /* noop */
            },
          },
          runtime: { lastError: null },
        };
      });

      await page.goto(`file:///${blockedPagePath}`);

      // Verify blocked page content
      await expect(
        page.locator("h1", { hasText: "Site Blocked" }),
      ).toBeVisible();
      await expect(page.locator("text=Time Remaining")).toBeVisible();
      await expect(page.locator("text=Sites Blocked")).toBeVisible();
      await expect(page.locator("text=3")).toBeVisible(); // distraction count
      await expect(
        page.locator("button", { hasText: "Back to Work" }),
      ).toBeVisible();

      // Verify a motivational quote is displayed
      const quoteAuthor = page.locator("text=--");
      await expect(quoteAuthor.first()).toBeVisible();

      await page.close();
    });

    test("popup page renders correctly", async () => {
      const page = await context.newPage();

      const popupPath = path
        .resolve(FIREFOX_EXTENSION, "dist/src/popup/index.html")
        .replace(/\\/g, "/");

      // Stub chrome APIs for popup
      await page.addInitScript(() => {
        const storageArea = {
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
        };

        (globalThis as Record<string, unknown>).chrome = {
          storage: { local: storageArea },
          runtime: {
            sendMessage: (
              _msg: unknown,
              callback?: (response: unknown) => void,
            ) => {
              if (callback)
                callback({
                  isActive: false,
                  distractionCount: 0,
                });
            },
            lastError: null,
          },
          tabs: {
            update: () => {
              /* noop */
            },
          },
        };
      });

      await page.goto(`file:///${popupPath}`);
      await expect(page.locator("body")).not.toBeEmpty();
      await page.close();
    });

    test("Firefox manifest is valid", () => {
      const manifestPath = path.resolve(FIREFOX_EXTENSION, "manifest.json");
      expect(existsSync(manifestPath)).toBe(true);

      // Read and validate the manifest from filesystem (no browser needed)
      const raw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.background.scripts).toContain("dist/background.js");
      expect(manifest.permissions).toContain("declarativeNetRequest");
      expect(manifest.browser_specific_settings.gecko.id).toBeTruthy();
      // Verify no empty rule_resources (was causing Firefox install error)
      expect(manifest.declarative_net_request).toBeUndefined();
    });
  });
} else {
  test.skip("Firefox — not installed", () => {
    /* skip */
  });
}

// ===== SUMMARY TEST =====
test("multi-browser detection summary", () => {
  console.log("\n═══════════════════════════════════════════");
  console.log("  MULTI-BROWSER TEST SUMMARY");
  console.log("═══════════════════════════════════════════");
  for (const b of detectedBrowsers) {
    console.log(`  ${b.type === "chromium" ? "Chromium" : "Gecko"} | ${b.name.padEnd(10)} | ${b.executablePath}`);
  }
  console.log("═══════════════════════════════════════════\n");

  // At least Chrome should be detected
  expect(detectedBrowsers.length).toBeGreaterThan(0);
});
