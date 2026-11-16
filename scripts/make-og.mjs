// Draws public/og.png (1200 × 630): the home hero alone, from the running site.
//   pnpm dev   (in another terminal), then   node scripts/make-og.mjs [url]
import { chromium } from '@playwright/test'
import { homedir } from 'node:os'

const url = process.argv[2] || 'http://localhost:5173'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
const browser = await chromium.launch({
  executablePath: executablePath ?? `${homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.addInitScript(() => localStorage.setItem('karama:theme', 'dark'))
await page.goto(`${url}/?og=1`)
await page.locator('.hero[data-webgl="ready"]').waitFor({ timeout: 20_000 })
await page.waitForTimeout(3500)
await page.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname })
await browser.close()
console.log('public/og.png written')
