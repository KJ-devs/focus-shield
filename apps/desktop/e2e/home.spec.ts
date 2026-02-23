import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should render the sidebar with Focus Shield branding", async ({
    page,
  }) => {
    await page.goto("/");

    // Sidebar brand
    await expect(page.locator("text=Focus Shield").first()).toBeVisible();

    // Sidebar navigation items
    await expect(page.locator("text=Home")).toBeVisible();
    await expect(page.locator("text=Sessions")).toBeVisible();
    await expect(page.locator("text=Analytics")).toBeVisible();
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Buddies")).toBeVisible();
    await expect(page.locator("text=Challenges")).toBeVisible();
    await expect(page.locator("text=Coworking")).toBeVisible();
  });

  test("should display the greeting and quick start presets", async ({
    page,
  }) => {
    await page.goto("/");

    // One of the greetings should be visible
    const greeting = page.locator("h1");
    await expect(greeting).toBeVisible();

    // Quick start presets
    await expect(page.locator("text=Quick Start")).toBeVisible();
    await expect(page.locator("text=Pomodoro")).toBeVisible();
    await expect(page.locator("text=Deep Work")).toBeVisible();
    await expect(page.locator("text=Quick Focus")).toBeVisible();
  });

  test("should display today's stats section", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Today's Stats")).toBeVisible();
    await expect(page.locator("text=Focus Time")).toBeVisible();
    await expect(page.locator("text=Sessions")).toBeVisible();
    await expect(page.locator("text=Distractions Blocked")).toBeVisible();
    await expect(page.locator("text=Streak")).toBeVisible();
  });

  test("should display the recent activity section", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Recent Activity")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate to Sessions page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Sessions");
    await expect(page).toHaveURL(/\/sessions/);
    await expect(page.locator("text=Launch Session")).toBeVisible();
  });

  test("should navigate to Analytics page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Analytics");
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator("h1", { hasText: "Analytics" })).toBeVisible();
  });

  test("should navigate to Settings page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
  });

  test("should navigate to Buddies page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Buddies");
    await expect(page).toHaveURL(/\/buddy/);
  });

  test("should navigate to Challenges page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Challenges");
    await expect(page).toHaveURL(/\/challenges/);
  });

  test("should navigate to Coworking page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Coworking");
    await expect(page).toHaveURL(/\/coworking/);
  });

  test("should navigate back to Home page", async ({ page }) => {
    await page.goto("/settings");
    await page.click("text=Home");
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Quick Start")).toBeVisible();
  });
});
