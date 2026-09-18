// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Defines the base URL so page.goto('/') resolves correctly
    baseURL: 'http://localhost:4200',
  },

  // Instructs Playwright to start the Angular server before running tests
  webServer: {
    command: 'npm start', // Or 'ng serve', matching your package.json scripts
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI, // Uses a running server if one already exists locally
    timeout: 120 * 1000, // Gives Angular time to compile before tests start
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

});