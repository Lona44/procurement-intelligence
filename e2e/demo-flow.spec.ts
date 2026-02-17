import { test, expect } from "@playwright/test";

test.describe("Demo flow", () => {
  test("clicking Try Demo navigates to the arena with a session", async ({ page }) => {
    await page.goto("/");

    // Verify the Try Demo button is visible
    const demoButton = page.getByRole("button", { name: /try demo/i });
    await expect(demoButton).toBeVisible();

    // Click it and wait for navigation
    await demoButton.click();
    await page.waitForURL(/\/arena\?session=/, { timeout: 10_000 });

    // Verify we're on the arena page with a session param
    expect(page.url()).toMatch(/\/arena\?session=[a-f0-9]+/);
  });

  test("arena page renders agent cards after demo start", async ({ page }) => {
    await page.goto("/");

    const demoButton = page.getByRole("button", { name: /try demo/i });
    await demoButton.click();
    await page.waitForURL(/\/arena\?session=/);

    // Wait for the agent cards to appear (they render after SSE connects)
    await expect(page.getByText("Conservative")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Aggressive")).toBeVisible();
    await expect(page.getByText("Balanced")).toBeVisible();
  });
});
