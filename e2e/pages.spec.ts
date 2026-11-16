import { expect, test } from './fixtures'

const LEGAL = ['mentions-legales', 'confidentialite', 'cookies', 'conditions', 'accessibilite', 'licence']

test('every legal page exists and has its title and summary', async ({ page }) => {
  for (const id of LEGAL)
    await test.step(id, async () => {
      await page.goto(`/#${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('complementary', { name: 'En bref' })).toBeVisible()
      await expect(page).toHaveTitle(/ · Karama-Ko$/)
    })
})

test('the footer links to every legal page and to the sources', async ({ page }) => {
  await page.goto('/#outils')
  const footer = page.locator('footer.site-footer')
  for (const name of ['Mentions légales', 'Confidentialité', 'Cookies et stockage local', 'Conditions d’utilisation', 'Accessibilité', 'Licence', 'Barèmes et sources'])
    await expect(footer.getByRole('link', { name })).toBeVisible()
})

test('the sources page lists the scale, its sources and its history', async ({ page }) => {
  await page.goto('/?brut=1000000#baremes')
  await expect(page.getByRole('heading', { name: 'Barèmes et sources' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Historique des barèmes' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Code du travail/ }).first()).toBeVisible()
})

test('an unknown address is a real 404 that explains itself', async ({ page }) => {
  const response = await page.goto('/pas-une-page')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Cette page n’existe pas' })).toBeVisible()
  await expect(page).toHaveTitle(/introuvable/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.getByRole('link', { name: 'Voir les dix outils' }).click()
  await expect(page.getByRole('heading', { name: /Combien vous/ })).toBeVisible()
})

test('an unknown tool is a 404 screen, not a wrong tool', async ({ page }) => {
  await page.goto('/#atelier/inconnu')
  await expect(page.getByRole('heading', { name: 'Cette page n’existe pas' })).toBeVisible()
  await page.goto('/#mentions-inconnues')
  await expect(page.getByRole('heading', { name: 'Cette page n’existe pas' })).toBeVisible()
})

test('the in-page skip link does not change the page', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1200000')
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Aller au résultat' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#resultat')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Calculer mon salaire' })).toBeVisible()
})

test('the embeddable calculator works on its own and is not indexed', async ({ page }) => {
  await page.goto('/?embed=1&brut=1000000')
  await expect(page.locator('.widget-answer')).toContainText('876')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('the title follows the page', async ({ page }) => {
  await page.goto('/')
  const home = await page.title()
  await page.goto('/#atelier/fin')
  await expect(page).toHaveTitle(/fin de contrat/i)
  await page.goto('/#confidentialite')
  await expect(page).toHaveTitle('Confidentialité · Karama-Ko')
  await page.goto('/')
  await expect(page).toHaveTitle(home)
})

test('the page is ready to be found and shared', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/.+\/$/)
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'])
    await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', /.+/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description!.length).toBeGreaterThan(70)
  expect(description!.length).toBeLessThanOrEqual(170)
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)
  expect(data['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['WebSite', 'WebApplication'])

  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toMatch(/Sitemap: .+\/sitemap\.xml/)
  const sitemap = await request.get('/sitemap.xml')
  expect(await sitemap.text()).toContain('<urlset')
  const image = await request.get('/og.png')
  expect(image.headers()['content-type']).toBe('image/png')
  expect((await image.body()).length).toBeGreaterThan(10_000)
})

test('security headers and compression are on', async ({ request }) => {
  const response = await request.get('/', { headers: { 'Accept-Encoding': 'br' } })
  const headers = response.headers()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).not.toContain("'unsafe-eval'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['content-encoding']).toBe('br')
  const health = await request.get('/api/health')
  expect(await health.json()).toEqual({ aiConfigured: false })
})
