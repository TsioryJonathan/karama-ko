// Redraws the README screenshots (docs/screenshots/*.jpg) from the running production server.
//   pnpm build && PORT=4173 APP_ORIGIN=http://127.0.0.1:4173 node --env-file=.env server/index.mjs
//   node scripts/make-screenshots.mjs [http://127.0.0.1:4173]
// With a key in .env the assistant screenshot shows a real answer; without one it is skipped.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { chromium } from '@playwright/test'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const out = new URL('../docs/screenshots/', import.meta.url).pathname
const cached = `${homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cached) ? cached : undefined),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

async function shoot(name, { path, theme = 'light', width = 1440, height = 900, scale = 1, prepare }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'fr-FR' })
  await context.addInitScript((t) => localStorage.setItem('karama:theme', t), theme)
  const page = await context.newPage()
  await page.goto(base + path)
  await prepare?.(page)
  await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 88 })
  await context.close()
  console.log(`docs/screenshots/${name}.jpg`)
}

const hero = async (page) => {
  await page.locator('.hero[data-webgl="ready"]').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(4000)
}
const result = async (page) => {
  await page.locator('#resultat').waitFor()
  await page.waitForTimeout(1200)
}

await shoot('hero', { path: '/', theme: 'dark', prepare: hero })
await shoot('tools', {
  path: '/#outils',
  prepare: async (page) => {
    await page.locator('.bento-tile').first().waitFor({ timeout: 20_000 })
    await page.waitForTimeout(1200)
    await page.evaluate(() => document.querySelector('.bento')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await page.evaluate(() => scrollBy({ top: -110, behavior: 'instant' }))
    await page.waitForTimeout(2200)
  },
})
await shoot('calculator', { path: '/?brut=1500000&pac=1#calculateur', height: 1000, prepare: result })
await shoot('compare', {
  path: '/#atelier/comparer',
  theme: 'dark',
  height: 1000,
  prepare: async (page) => {
    await page.locator('.verdict').waitFor()
    await page.evaluate(() => scrollTo({ top: 120, behavior: 'instant' }))
    await page.waitForTimeout(800)
  },
})
await shoot('end-of-contract', {
  path: '/#atelier/fin',
  height: 1000,
  prepare: async (page) => {
    await page.locator('.verdict').waitFor()
    await page.waitForTimeout(800)
  },
})

const health = await fetch(`${base}/api/health`).then((r) => r.json()).catch(() => ({}))
if (health.aiConfigured) {
  await shoot('assistant', {
    path: '/#atelier/negocier',
    height: 1000,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Pourquoi ce résultat ?' }).click()
      await page.locator('.assistant-answer .md').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(900)
    },
  })
} else console.log('assistant: no key configured, screenshot skipped')

// A phone, three screens side by side.
const phones = [
  ['m-hero', { path: '/', theme: 'dark', prepare: hero }],
  ['m-calculator', { path: '/?brut=1500000#calculateur', prepare: result }],
  ['m-compare', { path: '/#atelier/comparer', prepare: result }],
]
for (const [name, options] of phones)
  await shoot(name, { ...options, width: 390, height: 844, scale: 2, prepare: options.path === '/#atelier/comparer' ? async (p) => { await p.locator('.verdict').waitFor(); await p.waitForTimeout(800) } : options.prepare })
execFileSync('magick', [
  'montage',
  ...phones.map(([name]) => `${out}${name}.jpg`),
  '-tile', '3x1', '-geometry', 'x1100+14+0', '-background', '#e8e6e1', '-quality', '88', `${out}mobile.jpg`,
])
execFileSync('rm', phones.map(([name]) => `${out}${name}.jpg`))
console.log('docs/screenshots/mobile.jpg')
await browser.close()
