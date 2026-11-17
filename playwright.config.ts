import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const cached = `${homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`
/** Use the Chromium already on the machine when there is one; otherwise Playwright's own (`playwright install chromium`). */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cached) ? cached : undefined)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    launchOptions: { executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  // The production build, served by the production server: what visitors get.
  webServer: {
    // Counters in memory and a known password, so the dashboard can be tried without a database.
    command: `pnpm build && PORT=${PORT} METRICS_MEMORY=1 ADMIN_TOKEN=e2e-password node server/index.mjs`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
