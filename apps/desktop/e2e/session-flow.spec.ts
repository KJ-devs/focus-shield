import { test, expect } from "@playwright/test";

test.describe("Session Launcher Page", () => {
  test("should render the session launcher with preset options", async ({
    page,
  }) => {
    await page.goto("/launch");

    await expect(
      page.locator("h1", { hasText: "Launch Session" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose a Preset" })).toBeVisible();
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

    await expect(page.getByRole("heading", { name: "Lock Level" })).toBeVisible();
    // Lock level names
    await expect(page.locator("[data-testid='lock-level-1']")).toBeVisible();
    await expect(page.locator("[data-testid='lock-level-2']")).toBeVisible();
    await expect(page.locator("[data-testid='lock-level-3']")).toBeVisible();
    await expect(page.locator("[data-testid='lock-level-4']")).toBeVisible();
    await expect(page.locator("[data-testid='lock-level-5']")).toBeVisible();
  });

  test("should have a disabled launch button when no preset is selected", async ({
    page,
  }) => {
    await page.goto("/launch");

    const launchButton = page.locator("[data-testid='launch-session-btn']");
    await expect(launchButton).toBeVisible();
    await expect(launchButton).toBeDisabled();
  });

  test("should enable launch button after selecting a preset", async ({
    page,
  }) => {
    await page.goto("/launch");

    // Click on the Pomodoro Classic preset
    await page.locator("[data-testid='preset-pomodoro']").click();

    const launchButton = page.locator("[data-testid='launch-session-btn']");
    await expect(launchButton).toBeEnabled();
  });
});

test.describe("Sessions Page", () => {
  test("should render the sessions page with title", async ({
    page,
  }) => {
    await page.goto("/sessions");

    await expect(
      page.locator("h1", { hasText: "Sessions" }),
    ).toBeVisible();
  });

  test("should show idle view with 'No Active Session' when no session is running", async ({
    page,
  }) => {
    await page.goto("/sessions");

    await expect(page.locator("text=No Active Session")).toBeVisible();
    await expect(page.locator("text=Start a Session")).toBeVisible();
  });

  test("should show scheduled sessions section", async ({
    page,
  }) => {
    await page.goto("/sessions");

    await expect(page.getByRole("heading", { name: "Scheduled Sessions" })).toBeVisible();
  });

  test("should navigate to launch page when clicking Start a Session", async ({
    page,
  }) => {
    await page.goto("/sessions");

    await page.locator("text=Start a Session").click();
    await expect(page).toHaveURL(/\/launch/);
  });
});
