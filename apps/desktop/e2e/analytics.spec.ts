import { test, expect } from "@playwright/test";

test.describe("Analytics Page", () => {
  test("should render the analytics page with title", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.locator("h1", { hasText: "Analytics" })).toBeVisible();
  });

  test("should display period selector buttons", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.locator("text=30 days")).toBeVisible();
    await expect(page.locator("text=90 days")).toBeVisible();
    await expect(page.locator("text=1 year")).toBeVisible();
  });

  test("should display focus activity heatmap section", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.locator("text=Focus Activity")).toBeVisible();
  });

  test("should display focus trend chart section", async ({ page }) => {
    await page.goto("/analytics");

    await expect(
      page.locator("text=Focus Trend (30 days)"),
    ).toBeVisible();
  });

  test("should display streak section", async ({ page }) => {
    await page.goto("/analytics");

    await expect(
      page.locator("h2", { hasText: "Streak" }),
    ).toBeVisible();
  });

  test("should display today's timeline section", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.locator("text=Today's Timeline")).toBeVisible();
  });

  test("should display distractions, peak hours, and insights sections", async ({
    page,
  }) => {
    await page.goto("/analytics");

    await expect(
      page.locator("h2", { hasText: "Distractions" }),
    ).toBeVisible();
    await expect(
      page.locator("h2", { hasText: "Peak Hours" }),
    ).toBeVisible();
    await expect(
      page.locator("h2", { hasText: "Insights" }),
    ).toBeVisible();
  });

  test("should switch period to 90 days", async ({ page }) => {
    await page.goto("/analytics");

    await page.click("text=90 days");

    await expect(
      page.locator("text=Focus Trend (90 days)"),
    ).toBeVisible();
  });
});
