import { expect, test } from './fixtures'

const PAGES = ['/', '/?brut=1500000#calculateur', '/#atelier/comparer', '/#atelier/equipe', '/#atelier/annee', '/#atelier/fin', '/#confidentialite', '/?brut=1000000#baremes', '/pas-une-page']

for (const url of PAGES)
  test(`nothing overflows sideways on a phone: ${url}`, async ({ page }) => {
    await page.goto(url)
    await page.waitForTimeout(500)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

test('the calculator works on a phone, menus included', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1000000')
  await expect(page.locator('#resultat')).toContainText('876')
  await page.getByRole('button', { name: 'Mon salaire' }).click()
  const entry = page.locator('.menu-panel').getByRole('link', { name: /Comparer des offres/ })
  await expect(entry).toBeVisible()
  await entry.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Comparer des offres' })).toBeVisible()
})
