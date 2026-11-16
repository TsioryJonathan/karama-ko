import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const PAGES = [
  '/',
  '/?brut=1500000#calculateur',
  '/#atelier/comparer',
  '/#atelier/negocier',
  '/#atelier/fiche',
  '/#atelier/fin',
  '/#atelier/equipe',
  '/#atelier/annee',
  '/#confidentialite',
  '/?brut=1000000#baremes',
  '/pas-une-page',
]

for (const theme of ['light', 'dark'] as const)
  for (const url of PAGES)
    test(`no serious accessibility violation, ${theme}: ${url}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('karama:theme', t), theme)
      await page.goto(url)
      await page.waitForTimeout(600)
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(
        blocking.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`),
      ).toEqual([])
    })

test('the whole calculator can be used with the keyboard alone', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').focus()
  await page.keyboard.type('1000000')
  await expect(page.locator('#resultat')).toContainText('876')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).not.toBe('BODY')
})

test('the motion is switched off when the system asks for less', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height)
  expect(heroHeight).toBeLessThanOrEqual(900)
  await expect(page.locator('.hero-gross')).toBeHidden()
  await context.close()
})
