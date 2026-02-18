import { test, expect, Page } from "@playwright/test";

/** Shared helper: click Try Demo → land on preview → click Start Analysis → land on arena. */
async function demoToArena(page: Page) {
  await page.goto("/");
  const demoButton = page.getByRole("button", { name: /try demo/i });
  await demoButton.click();
  await page.waitForURL(/\/preview\?session=/, { timeout: 10_000 });

  // Preview page loads the data summary then shows "Start Analysis"
  const startButton = page.getByRole("button", { name: /start analysis/i });
  await expect(startButton).toBeVisible({ timeout: 10_000 });
  await startButton.click();
  await page.waitForURL(/\/arena\?session=/, { timeout: 10_000 });
}

test.describe("Demo flow", () => {
  test("clicking Try Demo navigates to the preview page with a session", async ({ page }) => {
    await page.goto("/");

    const demoButton = page.getByRole("button", { name: /try demo/i });
    await expect(demoButton).toBeVisible();

    await demoButton.click();
    await page.waitForURL(/\/preview\?session=/, { timeout: 10_000 });

    // Verify we're on the preview page with a session param
    expect(page.url()).toMatch(/\/preview\?session=[a-f0-9]+/);
  });

  test("preview page shows data overview with Start Analysis button", async ({ page }) => {
    await page.goto("/");

    const demoButton = page.getByRole("button", { name: /try demo/i });
    await demoButton.click();
    await page.waitForURL(/\/preview\?session=/, { timeout: 10_000 });

    // Data overview loads and shows the Start Analysis button
    await expect(page.getByText("Data Preview")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /start analysis/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("arena page renders agent cards after demo start", async ({ page }) => {
    await demoToArena(page);

    // Wait for the agent cards to appear (they render after SSE connects)
    await expect(page.getByText("Conservative")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Aggressive")).toBeVisible();
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("all 3 agents reach Complete with savings displayed", async ({ page }) => {
    await demoToArena(page);

    // Wait for all 3 agents to complete (mock mode should be fast)
    const completeLabels = page.getByText("Complete");
    await expect(completeLabels.first()).toBeVisible({ timeout: 30_000 });

    // There should be 3 "Complete" badges
    await expect(completeLabels).toHaveCount(3, { timeout: 30_000 });

    // Each agent should display savings with a $ sign
    const savingsElements = page.getByText(/^\$[\d,]+$/);
    await expect(savingsElements.first()).toBeVisible();
  });

  test("upvote triggers Behavioural Insight card", async ({ page }) => {
    await demoToArena(page);

    // Wait for agents to complete
    const completeLabels = page.getByText("Complete");
    await expect(completeLabels).toHaveCount(3, { timeout: 30_000 });

    // Click the first Upvote button
    const upvoteButton = page.getByRole("button", { name: /upvote/i }).first();
    await upvoteButton.click();

    // Wait for the Behavioural Insight card to appear
    await expect(
      page.getByText(/risk-averse|bold optimizer|pragmatic|strategic/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("export button downloads a .pdf file", async ({ page }) => {
    await demoToArena(page);

    // Wait for agents to complete
    const completeLabels = page.getByText("Complete");
    await expect(completeLabels).toHaveCount(3, { timeout: 30_000 });

    // Click export button and wait for download
    const downloadPromise = page.waitForEvent("download");
    const exportButton = page.getByRole("button", { name: /export pdf/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("comparison table appears after completion", async ({ page }) => {
    test.setTimeout(60_000);
    await demoToArena(page);

    // Wait for agents to complete
    const completeLabels = page.getByText("Complete");
    await expect(completeLabels).toHaveCount(3, { timeout: 45_000 });

    // Comparison table should appear
    await expect(page.getByText("Comparison")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("cell", { name: "Total Savings" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Recommendations" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Avg Confidence" })).toBeVisible();
  });
});
