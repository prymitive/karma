import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/e2e",
  outputDir: "./src/e2e/results",
  snapshotPathTemplate: "{testDir}/snapshots/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3123",
    screenshot: "off",
    video: "off",
    trace: "off",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: "npx vite --port 3123 --strictPort",
    port: 3123,
    reuseExistingServer: !process.env.CI,
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0,
    },
  },
});
