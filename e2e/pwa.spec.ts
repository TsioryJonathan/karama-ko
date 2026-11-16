import { expect, test } from './fixtures'

test('the manifest is complete, with icons that exist', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({ display: 'standalone', lang: 'fr', scope: '/' })
  expect(manifest.name.length).toBeGreaterThan(3)
  expect(manifest.start_url).toBeTruthy()
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true)
  for (const icon of manifest.icons) {
    const response = await request.get(`/${icon.src}`)
    expect(response.status(), icon.src).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
  }
})

test('the service worker installs and takes control: the app can be installed and used offline', async ({ page, context }) => {
  await page.goto('/')
  // Installing fails as a whole if one cached file is missing: wait for the real outcome.
  await page.evaluate(() => navigator.serviceWorker.ready)
  const state = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state)
  expect(state).toBe('activated')

  await page.reload()
  await context.setOffline(true)
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1000000')
  await expect(page.locator('#resultat')).toContainText('876')
  await context.setOffline(false)
})

test('every file the service worker caches is really served', async ({ request }) => {
  const worker = await (await request.get('/sw.js')).text()
  const files = [...worker.matchAll(/url:"([^"]+)"/g)].map((match) => match[1])
  expect(files.length).toBeGreaterThan(20)
  for (const file of files) expect((await request.get(`/${file}`)).status(), file).toBe(200)
})
