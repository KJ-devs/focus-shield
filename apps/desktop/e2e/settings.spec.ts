import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("should render the settings page with title", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
  });

  test("should display appearance section with dark mode toggle", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "Appearance" }),
    ).toBeVisible();
    await expect(page.getByText("Dark Mode", { exact: true })).toBeVisible();
  });

  test("should display lock level section", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "Lock Level" }),
    ).toBeVisible();
  });

  test("should display master key section", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "Master Key" }),
    ).toBeVisible();
  });

  test("should display notifications section", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "Notifications" }),
    ).toBeVisible();
  });

  test("should display morning intention section", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.locator("h2", { hasText: "Morning Intention" }),
    ).toBeVisible();
  });

  test("should display data export section", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h2", { hasText: "Data" })).toBeVisible();
    await expect(page.locator("text=Export Data")).toBeVisible();
  });

  test("should display about section with version", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h2", { hasText: "About" })).toBeVisible();
    await expect(page.getByText("v0.1.0").first()).toBeVisible();
  });
});
