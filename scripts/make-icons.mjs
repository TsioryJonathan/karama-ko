// Rebuild all browser / installed-app icons from the canonical vector logo.
// pnpm exec node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'

const publicDir = new URL('../public/', import.meta.url)
const mark = (await readFile(new URL('brand/karama-mark.svg', publicDir), 'utf8'))
  .split('\n').map(line => line.trimEnd()).join('\n')
const favicon = mark.replace('viewBox="0 0 128 128"', 'viewBox="12 8 104 112"')
await writeFile(new URL('icon.svg', publicDir), favicon)
const cached = `${homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cached) ? cached : undefined),
})
try {
  const page = await browser.newPage({ deviceScaleFactor: 1, colorScheme: 'light' })
  async function render(size, file, { maskable = false, transparent = false, tight = false } = {}) {
    const svg = tight ? favicon : mark
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:${transparent ? 'transparent' : '#f4f2ed'};color-scheme:light}body{display:grid;place-items:center}svg{width:${maskable ? '75%' : '100%'};height:${maskable ? '75%' : '100%'}}</style>${svg}`)
    return page.screenshot({ ...(file ? { path: new URL(file, publicDir).pathname } : {}), omitBackground: transparent })
  }
  for (const size of [192, 512]) await render(size, `icon-${size}.png`)
  await render(180, 'apple-touch-icon.png')
  await render(512, 'icon-maskable-512.png', { maskable: true })
  const pngs = []
  for (const size of [16, 32, 48]) {
    const png = await render(size, size === 32 ? 'favicon-32.png' : undefined, { transparent: true, tight: true })
    pngs.push({ size, png })
  }
  // ICO container with PNG entries; no raster-processing dependency required.
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16
    header[entry] = size
    header[entry + 1] = size
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  await writeFile(new URL('favicon.ico', publicDir), Buffer.concat([header, ...pngs.map(p => p.png)]))
  console.log('Generated SVG / ICO favicons, PNG fallback, Apple touch icon and PWA icons.')
} finally {
  await browser.close()
}
