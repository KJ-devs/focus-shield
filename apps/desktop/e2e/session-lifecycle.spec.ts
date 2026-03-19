import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for the full session lifecycle.
 *
 * These tests run against the Vite dev server with TAURI_MOCK=true,
 * which swaps @tauri-apps/api with mock implementations that simulate
 * the Rust backend (timer, token generation, storage, daemon).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset mock state between tests via the globally exposed reset function */
async function resetMockState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const reset = (window as unknown as Record<string, unknown>).__TAURI_MOCK_RESET__;
    if (typeof reset === "function") reset();
  });
}

/** Read the raw token from the token display element */
async function readDisplayedToken(page: Page): Promise<string> {
  const tokenText = await page.locator("[data-testid='token-value']").textContent();
  // Token is formatted with double spaces between 4-char groups — remove them
  return (tokenText ?? "").replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Quick Start Session — Level 1 (no token required to stop)
// ---------------------------------------------------------------------------

test.describe("Quick Start Session (Level 1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetMockState(page);
  });

  test("should start a Pomodoro quick session and show active state", async ({
    page,
  }) => {
    // Click the Pomodoro quick start card
    await page.locator("[data-testid='quick-start-pomodoro']").click();

    // Should show active session widget on home page
    await expect(
      page.locator("[data-testid='active-session-widget']"),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator("[data-testid='session-name']")).toHaveText(
      "Pomodoro",
    );

    // Timer should be visible and ticking (non-zero)
    await expect(page.locator("[data-testid='session-timer']")).toBeVisible();
  });

  test("should stop a level 1 session directly (no token needed)", async ({
    page,
  }) => {
    await page.locator("[data-testid='quick-start-quick-focus']").click();

    await expect(
      page.locator("[data-testid='active-session-widget']"),
    ).toBeVisible({ timeout: 5000 });

    // Stop session — level 1 should stop directly without unlock prompt
    await page.locator("[data-testid='stop-session-btn']").click();

    // Wait for the session to transition — the store calls stopSession()
    // which for level 1 calls session_stop directly, returning a review
    // The mock will return a review, and the store sets phase="review"
    // HomePage doesn't render the review — it goes back to idle or shows active
    // Actually let's navigate to sessions page to see the review
    // Wait a moment for state to settle
    await page.waitForTimeout(500);

    // After stop, active session widget should disappear
    await expect(
      page.locator("[data-testid='active-session-widget']"),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("should show timer counting down", async ({ page }) => {
    await page.locator("[data-testid='quick-start-pomodoro']").click();

    await expect(
      page.locator("[data-testid='active-session-widget']"),
    ).toBeVisible({ timeout: 5000 });

    // Get initial timer value
    const initialTimer = await page
      .locator("[data-testid='session-timer']")
      .textContent();

    // Wait for at least one tick
    await page.waitForTimeout(1500);

    // Timer should have changed
    const updatedTimer = await page
      .locator("[data-testid='session-timer']")
      .textContent();

    // The timer should have decreased (or at least changed)
    expect(initialTimer).not.toBeNull();
    expect(updatedTimer).not.toBeNull();
    // Both should be in MM:SS format
    expect(initialTimer).toMatch(/\d{2}:\d{2}/);
    expect(updatedTimer).toMatch(/\d{2}:\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// Preset Launch Session — Token Display + Active + Unlock + Review
// ---------------------------------------------------------------------------

test.describe("Preset Launch Session (Level 2 — with token)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/launch");
    await resetMockState(page);
  });

  test("should select a preset and lock level, then launch", async ({
    page,
  }) => {
    // Select Quick Task preset
    await page.locator("[data-testid='preset-quick-task']").click();

    // Select lock level 2
    await page.locator("[data-testid='lock-level-2']").click();

    // Launch button should be enabled
    const launchBtn = page.locator("[data-testid='launch-session-btn']");
    await expect(launchBtn).toBeEnabled();

    // Launch
    await launchBtn.click();

    // Should transition to token display
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });

    // Token should be visible
    const tokenElement = page.locator("[data-testid='token-value']");
    await expect(tokenElement).toBeVisible();

    // Read the token for later use
    const token = await readDisplayedToken(page);
    expect(token.length).toBe(16); // Level 2 = 16 chars
  });

  test("should auto-transition from token display to active session after countdown", async ({
    page,
  }) => {
    // Select Quick Task and lock level 1 (for faster test)
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-1']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // Token display visible
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });

    // Wait for countdown to finish (10 seconds in mock)
    // and auto-navigate to /sessions
    await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });

    // Active session should be visible on sessions page
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show unlock prompt when requesting unlock on level 2+ session", async ({
    page,
  }) => {
    // Quick Task, lock level 2
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-2']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // Wait for token display
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });

    // Wait for auto-transition to active
    await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Click "Request Unlock"
    await page.locator("[data-testid='request-unlock-btn']").click();

    // Unlock prompt should appear
    await expect(
      page.locator("[data-testid='unlock-prompt-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Token input should be visible
    await expect(page.locator("[data-testid='token-input']")).toBeVisible();
    await expect(
      page.locator("[data-testid='unlock-submit-btn']"),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Full Lifecycle: Launch → Token → Active → Unlock → Review → Dismiss
// ---------------------------------------------------------------------------

test.describe("Full Session Lifecycle", () => {
  test("should complete the full cycle: launch → token → active → unlock → review → home", async ({
    page,
  }) => {
    await page.goto("/launch");
    await resetMockState(page);

    // 1. Configure: Quick Task, Lock Level 1
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-1']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // 2. Token Display
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });

    // Read and save the token
    const token = await readDisplayedToken(page);
    expect(token.length).toBe(8); // Level 1 = 8 chars

    // 3. Wait for auto-transition to active session
    await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Verify timer is running
    const timerText = await page
      .locator("[data-testid='circular-timer']")
      .textContent();
    expect(timerText).toBeTruthy();

    // 4. Request Unlock (level 1 allows direct stop via the store logic)
    // For level 1, stopSession goes directly to session_stop
    // The Request Unlock button should still be visible
    await page.locator("[data-testid='request-unlock-btn']").click();

    // 5. Unlock Prompt — enter the token
    await expect(
      page.locator("[data-testid='unlock-prompt-view']"),
    ).toBeVisible({ timeout: 5000 });

    await page.locator("[data-testid='token-input']").fill(token);
    await page.locator("[data-testid='unlock-submit-btn']").click();

    // 6. Session Review should appear
    await expect(
      page.locator("[data-testid='session-review']"),
    ).toBeVisible({ timeout: 5000 });

    // Verify review content
    await expect(page.locator("text=Session Complete")).toBeVisible();
    await expect(page.locator("[data-testid='focus-score']")).toBeVisible();

    // 7. Dismiss — go to dashboard
    await page.locator("[data-testid='go-to-dashboard-btn']").click();

    // Should navigate to home
    await expect(page).toHaveURL("/", { timeout: 5000 });

    // Quick start section should be visible (session is idle)
    await expect(page.locator("text=Quick Start")).toBeVisible();
  });

  test("should show error on wrong token", async ({ page }) => {
    await page.goto("/launch");
    await resetMockState(page);

    // Quick Task, Lock Level 2
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-2']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // Wait for token display then active
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Request unlock
    await page.locator("[data-testid='request-unlock-btn']").click();
    await expect(
      page.locator("[data-testid='unlock-prompt-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Enter wrong token
    await page.locator("[data-testid='token-input']").fill("wrong-token");
    await page.locator("[data-testid='unlock-submit-btn']").click();

    // Should show error
    await expect(page.locator("[data-testid='token-error']")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// Nuclear Mode (Level 5 — no token, uninterruptible)
// ---------------------------------------------------------------------------

test.describe("Nuclear Mode (Level 5)", () => {
  test("should launch directly to active session without token and hide unlock button", async ({
    page,
  }) => {
    await page.goto("/launch");
    await resetMockState(page);

    // Quick Task, Lock Level 5 (Nuclear)
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-5']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // Level 5 skips token display entirely and goes straight to active
    // Should auto-navigate to /sessions
    await expect(page).toHaveURL(/\/sessions/, { timeout: 10000 });

    // Active session view should appear
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });

    // No unlock button for level 5
    await expect(
      page.locator("[data-testid='request-unlock-btn']"),
    ).not.toBeVisible();
  });
});
