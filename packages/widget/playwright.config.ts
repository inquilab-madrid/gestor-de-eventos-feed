import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
