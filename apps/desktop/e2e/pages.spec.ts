import { test, expect } from "@playwright/test";

// =============================================================================
// Blocklists Page
// =============================================================================

test.describe("Blocklists Page", () => {
  test("should render with title Blocklists", async ({ page }) => {
    await page.goto("/blocklists");

    await expect(page.locator("h1", { hasText: "Blocklists" })).toBeVisible();
    await expect(
      page.locator("text=Manage domains and processes to block during focus sessions."),
    ).toBeVisible();
  });

  test("should show built-in blocklist categories", async ({ page }) => {
    await page.goto("/blocklists");

    await expect(
      page.locator("h2", { hasText: "Built-in Lists" }),
    ).toBeVisible();

    await expect(page.locator("h3", { hasText: "Social Media" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "Entertainment" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "Gaming" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "News" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "Shopping" })).toBeVisible();
  });

  test("should show toggle switches for blocklist categories", async ({
    page,
  }) => {
    await page.goto("/blocklists");

    // Each built-in blocklist card has a toggle switch (role="switch")
    const switches = page.locator("role=switch");
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("should show active count badge", async ({ page }) => {
    await page.goto("/blocklists");

    // Default: Social Media and Entertainment are enabled = 2 active
    await expect(page.locator("text=2 active")).toBeVisible();
  });

  test("should show custom lists section with create button", async ({
    page,
  }) => {
    await page.goto("/blocklists");

    await expect(
      page.locator("h2", { hasText: "Custom Lists" }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "+ Create Custom List" }),
    ).toBeVisible();
  });

  test("should show empty state for custom lists", async ({ page }) => {
    await page.goto("/blocklists");

    await expect(
      page.locator("text=No custom blocklists yet"),
    ).toBeVisible();
  });

  test("should show domain count for built-in lists", async ({ page }) => {
    await page.goto("/blocklists");

    // Social Media has 7 domains
    await expect(page.locator("text=7 domains").first()).toBeVisible();
  });
});

// =============================================================================
// Profiles Page
// =============================================================================

test.describe("Profiles Page", () => {
  test("should render with title Profiles", async ({ page }) => {
    await page.goto("/profiles");

    await expect(page.locator("h1", { hasText: "Profiles" })).toBeVisible();
  });

  test("should show the default Work profile", async ({ page }) => {
    await page.goto("/profiles");

    await expect(page.locator("h3", { hasText: "Work" })).toBeVisible();
  });

  test("should show Active badge on the default profile", async ({ page }) => {
    await page.goto("/profiles");

    await expect(page.locator("text=Active").first()).toBeVisible();
  });

  test("should show lock level and daily goal for default profile", async ({
    page,
  }) => {
    await page.goto("/profiles");

    // Default profile has lock level 2 = "Moderate"
    await expect(page.locator("text=Moderate").first()).toBeVisible();
    // Default profile has 240 min = 4h 0m/day
    await expect(page.locator("text=4h 0m/day")).toBeVisible();
  });

  test("should show Add Profile button", async ({ page }) => {
    await page.goto("/profiles");

    await expect(
      page.getByRole("button", { name: "+ Add Profile" }),
    ).toBeVisible();
  });

  test("should show Edit and Delete buttons for the profile", async ({
    page,
  }) => {
    await page.goto("/profiles");

    await expect(
      page.getByRole("button", { name: "Edit" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete" }),
    ).toBeVisible();
  });
});

// =============================================================================
// Buddy Page
// =============================================================================

test.describe("Buddy Page", () => {
  test("should render with title Focus Buddies", async ({ page }) => {
    await page.goto("/buddy");

    await expect(
      page.locator("h1", { hasText: "Focus Buddies" }),
    ).toBeVisible();
  });

  test("should show the Add a Buddy section", async ({ page }) => {
    await page.goto("/buddy");

    await expect(page.locator("h3", { hasText: "Add a Buddy" })).toBeVisible();
  });

  test("should show Create Invite Code and Enter Invite Code buttons", async ({
    page,
  }) => {
    await page.goto("/buddy");

    await expect(
      page.getByRole("button", { name: "Create Invite Code" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enter Invite Code" }),
    ).toBeVisible();
  });

  test("should show Your Buddies section with empty state", async ({
    page,
  }) => {
    await page.goto("/buddy");

    await expect(
      page.locator("h3", { hasText: "Your Buddies" }),
    ).toBeVisible();
    await expect(
      page.locator("text=No buddies yet"),
    ).toBeVisible();
  });

  test("should show Notifications section", async ({ page }) => {
    await page.goto("/buddy");

    await expect(
      page.locator("h3", { hasText: "Notifications" }),
    ).toBeVisible();
  });
});

// =============================================================================
// Challenges Page
// =============================================================================

test.describe("Challenges Page", () => {
  test("should render with title Challenges", async ({ page }) => {
    await page.goto("/challenges");

    await expect(
      page.locator("h1", { hasText: "Challenges" }),
    ).toBeVisible();
  });

  test("should show Create a Weekly Challenge section", async ({ page }) => {
    await page.goto("/challenges");

    await expect(
      page.locator("h3", { hasText: "Create a Weekly Challenge" }),
    ).toBeVisible();
    await expect(
      page.locator(
        "text=Start a new weekly focus challenge and invite others to compete",
      ),
    ).toBeVisible();
  });

  test("should show challenge creation input and button", async ({ page }) => {
    await page.goto("/challenges");

    await expect(
      page.locator("input[placeholder*='Challenge title']"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create" }),
    ).toBeVisible();
  });

  test("should show Weekly Report section", async ({ page }) => {
    await page.goto("/challenges");

    await expect(
      page.locator("h3", { hasText: "Weekly Report" }),
    ).toBeVisible();
  });

  test("should show empty state message for weekly report", async ({
    page,
  }) => {
    await page.goto("/challenges");

    await expect(
      page.locator("text=No active challenges to report on"),
    ).toBeVisible();
  });
});

// =============================================================================
// Coworking Page
// =============================================================================

test.describe("Coworking Page", () => {
  test("should render with title Virtual Coworking", async ({ page }) => {
    await page.goto("/coworking");

    await expect(
      page.locator("h1", { hasText: "Virtual Coworking" }),
    ).toBeVisible();
  });

  test("should show Create a Coworking Room section", async ({ page }) => {
    await page.goto("/coworking");

    await expect(
      page.locator("h3", { hasText: "Create a Coworking Room" }),
    ).toBeVisible();
    await expect(
      page.locator(
        "text=Create a virtual coworking room and invite others to focus together",
      ),
    ).toBeVisible();
  });

  test("should show room creation input and button", async ({ page }) => {
    await page.goto("/coworking");

    await expect(
      page.locator("input[placeholder*='Room name']"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Room" }),
    ).toBeVisible();
  });

  test("should show Join a Room section", async ({ page }) => {
    await page.goto("/coworking");

    await expect(
      page.locator("h3", { hasText: "Join a Room" }),
    ).toBeVisible();
    await expect(
      page.locator(
        "text=Enter an invite code to join an existing coworking room",
      ),
    ).toBeVisible();
  });

  test("should show join room input and button", async ({ page }) => {
    await page.goto("/coworking");

    await expect(
      page.locator("input[placeholder='Invite code']"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Join" }),
    ).toBeVisible();
  });
});
