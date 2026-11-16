import { ar, digits, expect, test } from './fixtures'

test('gross to net, with the detail of the calculation', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1500000')
  await expect(page.locator('#resultat')).toContainText(digits(1_268_500))
  await expect(page.locator('#resultat')).toContainText(digits(201_500))
  await page.getByRole('button', { name: 'Voir comment c’est calculé' }).click()
  await expect(page.getByText('2. Impôt sur le revenu (IRSA)')).toBeVisible()
  await expect(page.getByText('Votre salaire net').first()).toBeVisible()
})

test('the dropdowns work with the keyboard', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1000000')
  const dependants = page.getByRole('combobox', { name: /Personnes à charge/ })
  await dependants.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(dependants).toContainText('2 personnes')
  await expect(page.locator('#resultat')).toContainText(digits(880_500))
  await dependants.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
})

test('net to gross', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByRole('combobox', { name: 'Je pars de' }).click()
  await page.getByRole('option', { name: 'Le net que je souhaite' }).click()
  await page.getByLabel(/Net souhaité/).fill('876500')
  // The smallest gross that gives at least 876 500 Ar net: the base of the IRSA is rounded to the hundred.
  await expect(page.locator('#resultat')).toContainText(digits(999_980))
})

test('bonuses, overtime and benefits change the result, and survive a reload', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('1500000')
  await page.getByRole('button', { name: /Primes, heures supplémentaires/ }).click()
  await page.getByLabel('Primes et gratifications du mois').fill('200000')
  await expect(page.locator('#resultat')).toContainText('Primes')
  await expect(page.locator('#resultat')).toContainText(digits(1_700_000))
  await page.getByLabel('Premières heures').fill('10')
  await expect(page.locator('#resultat')).toContainText('Heures supplémentaires')
  await page.getByLabel('Loyer réel du logement fourni').fill('800000')
  await expect(page.locator('#resultat')).toContainText('Avantages en nature')
  const url = page.url()
  expect(url).toContain('prime=200000')
  await page.reload()
  await expect(page.getByLabel('Primes et gratifications du mois')).toHaveValue(digits(200_000))
})

test('the link of a calculation reopens it', async ({ page }) => {
  await page.goto('/?brut=2000000&pac=1#calculateur')
  await expect(page.getByLabel('Salaire brut, par mois')).toHaveValue(digits(2_000_000))
  await expect(page.getByRole('combobox', { name: /Personnes à charge/ })).toContainText('1 personne')
})

test('too large an amount is refused politely', async ({ page }) => {
  await page.goto('/#calculateur')
  await page.getByLabel('Salaire brut, par mois').fill('9999999999')
  await expect(page.getByText(/Montant trop élevé/)).toBeVisible()
})

test('copying the link shows a confirmation', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/?brut=1000000#calculateur')
  await page.getByRole('button', { name: /Partager ce calcul/ }).click()
  await page.getByRole('button', { name: /Copier le lien/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lien copié' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('brut=1000000')
})

test('the amount in words stays in Ariary', async ({ page }) => {
  await page.goto('/?brut=1000000#calculateur')
  await expect(page.locator('#resultat')).toContainText(ar(876_500))
})
