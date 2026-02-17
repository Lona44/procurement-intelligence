import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000",
      port: 8000,
      reuseExistingServer: true,
    },
    {
      command: "cd frontend && npm run dev",
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});
