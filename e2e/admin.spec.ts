import { expect, test } from '@playwright/test'

test('the dashboard asks for a password, refuses a wrong one and shows counters with the right one', async ({ page }) => {
  // Something to count: a visit, a tool, the share link.
  await page.goto('/#atelier/comparer')
  await expect(page.getByRole('heading', { name: 'Comparer des offres' }).first()).toBeVisible()
  await page.goto('/#admin')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  await page.getByLabel('Mot de passe').fill('wrong')
  await page.getByRole('button', { name: 'Ouvrir' }).click()
  await expect(page.getByRole('alert')).toContainText('Mot de passe incorrect')
  await page.getByLabel('Mot de passe').fill('e2e-password')
  await page.getByRole('button', { name: 'Ouvrir' }).click()
  await expect(page.getByRole('term').filter({ hasText: 'Visites' })).toBeVisible()
  const cookie = (await page.context().cookies()).find((c) => c.name === '__Host-karama_admin')
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict' })
  expect(await page.evaluate(() => sessionStorage.getItem('karama:admin'))).toBeNull()
  expect(await page.evaluate(() => document.cookie)).not.toContain('__Host-karama_admin')
  await page.reload()
  await expect(page.getByRole('term').filter({ hasText: 'Visites' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Outils utilisés' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Options utilisées' })).toBeVisible()
  // The counter of the tool opened above is in the table.
  await expect(page.getByRole('row', { name: /Comparer des offres/ })).toBeVisible()
  await page.getByRole('button', { name: '7 jours' }).click()
  await expect(page.getByRole('button', { name: '7 jours' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  expect((await page.context().request.get('/api/metrics')).status()).toBe(401)
  await page.reload()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
})

test('the dashboard is not indexed and the page does not report when the browser refuses tracking', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'Sec-GPC': '1' } })
  await context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }))
  const page = await context.newPage()
  const calls: string[] = []
  page.on('request', (r) => r.url().includes('/api/track') && calls.push(r.url()))
  await page.goto('/#atelier/fin')
  await page.waitForTimeout(800)
  expect(calls).toEqual([])
  await page.goto('/#admin')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await context.close()
})

test('/admin opens the dashboard, with a 200 and not a 404', async ({ page }) => {
  const response = await page.goto('/admin')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#admin')
  expect(new URL(page.url()).pathname).toBe('/')
  // Any other unknown address is still a real 404.
  expect((await page.goto('/admins'))?.status()).toBe(404)
})

test('legacy passwords are removed from sessionStorage without reusing them', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('karama:admin', 'legacy-password'))
  await page.goto('/admin')
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('karama:admin'))).toBeNull()
})
