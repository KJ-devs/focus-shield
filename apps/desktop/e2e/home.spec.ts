import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should render the sidebar with Focus Shield branding", async ({
    page,
  }) => {
    await page.goto("/");

    // Sidebar brand
    await expect(page.locator("text=Focus Shield").first()).toBeVisible();

    // Sidebar navigation items (use first() to avoid ambiguity)
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sessions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("should display the greeting and quick start presets", async ({
    page,
  }) => {
    await page.goto("/");

    // One of the greetings should be visible
    const greeting = page.locator("h1").first();
    await expect(greeting).toBeVisible();

    // Quick start presets
    await expect(page.locator("text=Quick Start")).toBeVisible();
    await expect(page.locator("[data-testid='quick-start-pomodoro']")).toBeVisible();
    await expect(page.locator("[data-testid='quick-start-deep-work']")).toBeVisible();
    await expect(page.locator("[data-testid='quick-start-quick-focus']")).toBeVisible();
  });

  test("should display today's stats section", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Today's Stats")).toBeVisible();
    await expect(page.locator("[data-testid='stat-focus-time']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-sessions']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-distractions']")).toBeVisible();
    await expect(page.locator("[data-testid='stat-streak']")).toBeVisible();
  });

  test("should display the recent activity section", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Recent Activity")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate to Sessions page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sessions" }).click();
    await expect(page).toHaveURL(/\/sessions/);
    await expect(page.locator("h1", { hasText: "Sessions" })).toBeVisible();
  });

  test("should navigate to Analytics page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator("h1", { hasText: "Analytics" })).toBeVisible();
  });

  test("should navigate to Settings page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
  });

  test("should navigate back to Home page", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Quick Start")).toBeVisible();
  });
});
