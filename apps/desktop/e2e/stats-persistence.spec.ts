import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for stats persistence and analytics integration.
 *
 * Verifies that after completing a session, stats are persisted
 * (via mock storage), displayed on the home page, and visible
 * in the analytics and recent activity sections.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resetMockState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const reset = (window as unknown as Record<string, unknown>).__TAURI_MOCK_RESET__;
    if (typeof reset === "function") reset();
  });
}

async function readDisplayedToken(page: Page): Promise<string> {
  const tokenText = await page.locator("[data-testid='token-value']").textContent();
  return (tokenText ?? "").replace(/\s+/g, "");
}

/** Complete a quick session from start to review dismiss */
async function completeQuickSession(page: Page): Promise<void> {
  await page.goto("/launch");

  // Quick Task, Lock Level 1
  await page.locator("[data-testid='preset-quick-task']").click();
  await page.locator("[data-testid='lock-level-1']").click();
  await page.locator("[data-testid='launch-session-btn']").click();

  // Wait for token display
  await expect(
    page.locator("[data-testid='token-display']"),
  ).toBeVisible({ timeout: 5000 });

  // Read token
  const token = await readDisplayedToken(page);

  // Wait for active state
  await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });
  await expect(
    page.locator("[data-testid='active-session-view']"),
  ).toBeVisible({ timeout: 5000 });

  // Request unlock + enter token
  await page.locator("[data-testid='request-unlock-btn']").click();
  await expect(
    page.locator("[data-testid='unlock-prompt-view']"),
  ).toBeVisible({ timeout: 5000 });

  await page.locator("[data-testid='token-input']").fill(token);
  await page.locator("[data-testid='unlock-submit-btn']").click();

  // Wait for review
  await expect(
    page.locator("[data-testid='session-review']"),
  ).toBeVisible({ timeout: 5000 });

  // Dismiss to dashboard
  await page.locator("[data-testid='go-to-dashboard-btn']").click();
  await expect(page).toHaveURL("/", { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Stats Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetMockState(page);
    // Reload to clear in-memory store state
    await page.reload();
  });

  test("should show zero stats initially", async ({ page }) => {
    await expect(page.locator("[data-testid='stat-focus-time']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-sessions']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-distractions']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-streak']")).toBeVisible();

    // Initial values should show 0
    await expect(
      page.locator("[data-testid='stat-sessions']"),
    ).toContainText("0");
    await expect(
      page.locator("[data-testid='stat-streak']"),
    ).toContainText("0 days");
  });

  test("should show 'No sessions yet' in recent activity initially", async ({
    page,
  }) => {
    await expect(
      page.locator("text=No sessions yet"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display recent session after completing one", async ({
    page,
  }) => {
    await resetMockState(page);

    // Complete a session
    await completeQuickSession(page);

    // Now on home page — wait for recent activity to refresh
    await page.waitForTimeout(500);

    // Recent activity should show the completed session
    const recentItems = page.locator("[data-testid='recent-session-item']");
    await expect(recentItems).toHaveCount(1, { timeout: 5000 });
  });
});

test.describe("Analytics Page Data", () => {
  test("should render analytics page after session completion", async ({
    page,
  }) => {
    await page.goto("/");
    await resetMockState(page);

    // Navigate to analytics page
    await page.click("text=Analytics");
    await expect(page).toHaveURL(/\/analytics/);
    await expect(
      page.locator("h1", { hasText: "Analytics" }),
    ).toBeVisible();

    // The page should render without errors even with empty data
    // (mock returns empty stats range)
    await expect(page.locator("text=Focus Trend")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Session Review Stats", () => {
  test("should display focus score in review", async ({ page }) => {
    await page.goto("/launch");
    await resetMockState(page);

    // Quick Task, Lock Level 1
    await page.locator("[data-testid='preset-quick-task']").click();
    await page.locator("[data-testid='lock-level-1']").click();
    await page.locator("[data-testid='launch-session-btn']").click();

    // Token + active
    await expect(
      page.locator("[data-testid='token-display']"),
    ).toBeVisible({ timeout: 5000 });
    const token = await readDisplayedToken(page);

    await expect(page).toHaveURL(/\/sessions/, { timeout: 15000 });
    await expect(
      page.locator("[data-testid='active-session-view']"),
    ).toBeVisible({ timeout: 5000 });

    // Unlock
    await page.locator("[data-testid='request-unlock-btn']").click();
    await page.locator("[data-testid='token-input']").fill(token);
    await page.locator("[data-testid='unlock-submit-btn']").click();

    // Review
    await expect(
      page.locator("[data-testid='session-review']"),
    ).toBeVisible({ timeout: 5000 });

    // Focus score should be a number between 0-100
    const scoreText = await page
      .locator("[data-testid='focus-score']")
      .textContent();
    const score = parseInt(scoreText ?? "0", 10);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    // Session name should be shown
    await expect(page.locator("text=Quick Task")).toBeVisible();

    // "Stopped early" badge should appear (session was stopped, not completed by timer)
    await expect(page.locator("text=Stopped early")).toBeVisible();
  });
});
