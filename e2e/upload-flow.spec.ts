import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Upload flow", () => {
  const testCsvPath = path.resolve(__dirname, "fixtures/test-data.csv");

  test("upload CSV shows preview with column stats", async ({ page }) => {
    await page.goto("/upload");

    // Upload the test CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    // Wait for navigation to preview page
    await page.waitForURL(/\/preview/, { timeout: 15_000 });

    // Should show column mapping UI
    await expect(page.getByText(/date/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/vendor/i)).toBeVisible();
    await expect(page.getByText(/amount/i)).toBeVisible();
  });

  test("full upload → confirm mappings → arena → agents complete", async ({ page }) => {
    await page.goto("/upload");

    // Upload the test CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);

    // Wait for preview page
    await page.waitForURL(/\/preview/, { timeout: 15_000 });

    // Click confirm mappings button
    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await expect(confirmButton).toBeVisible({ timeout: 10_000 });
    await confirmButton.click();

    // Wait for data overview to load (shows after mappings confirmed)
    await expect(page.getByText(/total spend/i)).toBeVisible({ timeout: 10_000 });

    // Click "Start Analysis" to go to arena
    const startButton = page.getByRole("link", { name: /start analysis/i }).or(
      page.getByRole("button", { name: /start analysis/i }),
    );
    await expect(startButton).toBeVisible({ timeout: 5_000 });
    await startButton.click();

    // Wait for arena page
    await page.waitForURL(/\/arena/, { timeout: 10_000 });

    // Wait for agents to complete
    const completeLabels = page.getByText("Complete");
    await expect(completeLabels.first()).toBeVisible({ timeout: 30_000 });
  });
});
