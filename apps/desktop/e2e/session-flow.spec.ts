import { test, expect } from "@playwright/test";

test.describe("Session Launcher Page", () => {
  test("should render the session launcher with preset options", async ({
    page,
  }) => {
    await page.goto("/launch");

    await expect(
      page.locator("h1", { hasText: "Launch Session" }),
    ).toBeVisible();
    await expect(page.locator("text=Choose a Preset")).toBeVisible();
  });

  test("should display all session presets", async ({ page }) => {
    await page.goto("/launch");

    // Presets defined in the app
    await expect(page.locator("text=Pomodoro Classic")).toBeVisible();
    await expect(page.locator("text=Deep Work")).toBeVisible();
    await expect(page.locator("text=Sprint")).toBeVisible();
    await expect(page.locator("text=Study Session")).toBeVisible();
    await expect(page.locator("text=Flow State")).toBeVisible();
    await expect(page.locator("text=Quick Task")).toBeVisible();
    await expect(page.locator("text=Marathon")).toBeVisible();
  });

  test("should display lock level selector", async ({ page }) => {
    await page.goto("/launch");

    await expect(page.locator("text=Lock Level")).toBeVisible();
    // Lock level names
    await expect(page.locator("text=Gentle")).toBeVisible();
    await expect(page.locator("text=Moderate")).toBeVisible();
    await expect(page.locator("text=Strict")).toBeVisible();
    await expect(page.locator("text=Hardcore")).toBeVisible();
    await expect(page.locator("text=Nuclear")).toBeVisible();
  });

  test("should have a disabled launch button when no preset is selected", async ({
    page,
  }) => {
    await page.goto("/launch");

    const launchButton = page.locator("button", {
      hasText: "Launch Session",
    });
    await expect(launchButton).toBeVisible();
    await expect(launchButton).toBeDisabled();
  });

  test("should enable launch button after selecting a preset", async ({
    page,
  }) => {
    await page.goto("/launch");

    // Click on the Pomodoro Classic preset
    await page.locator("text=Pomodoro Classic").click();

    const launchButton = page.locator("button", {
      hasText: "Launch Session",
    });
    await expect(launchButton).toBeEnabled();
  });
});

test.describe("Sessions Page", () => {
  test("should render the sessions page with launch button", async ({
    page,
  }) => {
    await page.goto("/sessions");

    await expect(
      page.locator("h1", { hasText: "Launch Session" }),
    ).toBeVisible();
  });
});
