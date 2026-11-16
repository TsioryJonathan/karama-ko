import { digits, expect, test } from './fixtures'

test('the home page tells the story, then offers the tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Karama-Ko' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calculer mon salaire' }).first()).toBeVisible()
  await expect(page).toHaveTitle(/Karama-Ko/)

  // Scrolling through the pinned story ends on the answer, then on the tools.
  await page.evaluate(() => scrollTo(0, innerHeight * 3.6))
  // The 3D scene is drawn in software here, so the eased scroll can take a few seconds to catch up.
  await expect(page.locator('.hero-net[data-live]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.hero-net')).toContainText(digits(876_500))
  await page.evaluate(() => document.getElementById('outils')?.scrollIntoView())
  await expect(page.getByRole('heading', { name: /Combien vous/ })).toBeVisible()
})

test('the quick calculator answers as you type', async ({ page }) => {
  await page.goto('/#outils')
  const field = page.locator('.quick').getByLabel('Votre salaire brut, par mois')
  await field.fill('2000000')
  await expect(page.locator('.quick-figure')).toContainText(digits(1_660_500))
  await page.locator('.quick-amounts button', { hasText: '1 000 000' }).click()
  await expect(page.locator('.quick-figure')).toContainText(digits(876_500))
})

test('the ten tools are all there and open', async ({ page }) => {
  await page.goto('/#outils')
  const tiles = page.locator('.bento-tile')
  await expect(tiles).toHaveCount(10)
  await tiles.filter({ hasText: 'Comparer des offres' }).click()
  await expect(page).toHaveURL(/#atelier\/comparer/)
  await expect(page.getByRole('heading', { level: 1, name: 'Comparer des offres' })).toBeVisible()
})

test('the theme choice sticks', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: 'Thème sombre' }).click()
  const after = await html.getAttribute('data-theme')
  expect(after).not.toBe(before)
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', after!)
})
