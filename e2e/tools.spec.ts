import { digits, expect, test } from './fixtures'

test.beforeEach(async ({ page }) => {
  // Every test starts from a clean browser: the first visit.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-started')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-started', '1')
    }
  })
})

test('compare: the best offer is named and the table agrees', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  await expect(page.locator('.verdict')).toContainText(digits(156_800))
  await expect(page.locator('.verdict')).toContainText(digits(1_881_600))
  const offer = page.getByLabel('Salaire de base mensuel').nth(1)
  await offer.fill('2000000')
  await expect(page.locator('.verdict')).toContainText(digits(784_000))
  await expect(page.locator('.verdict')).toContainText(digits(9_408_000))
  await expect(page.locator('.studio-table tbody tr')).toHaveCount(2)
  await page.getByRole('button', { name: 'Ajouter une proposition' }).click()
  await expect(page.locator('.studio-table tbody tr')).toHaveCount(3)
})

test('compare: a bonus on an offer counts in its net', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  const before = await page.locator('.studio-table tbody tr').nth(1).innerText()
  await page.getByRole('button', { name: /Primes, heures supplémentaires/ }).nth(1).click()
  await page.getByLabel('Primes et gratifications du mois').first().fill('300000')
  await expect(page.locator('.studio-table tbody tr').nth(1)).not.toHaveText(before)
})

test('negotiate: the gross to ask for', async ({ page }) => {
  await page.goto('/#atelier/negocier')
  await expect(page.locator('.verdict')).toContainText(digits(1_191_306))
  await page.getByLabel('Net en plus que vous visez, par mois').fill('300000')
  await expect(page.locator('.verdict')).not.toContainText(digits(1_191_306))
})

test('explore: the slider and the field stay in step', async ({ page }) => {
  await page.goto('/#atelier/explorer')
  await page.getByLabel('Salaire brut exploré').fill('2500000')
  await expect(page.locator('.verdict')).toContainText(digits(2_500_000))
  await expect(page.locator('#salary-range')).toHaveValue('2500000')
})

test('payslip: matching figures say so, a gap is named', async ({ page }) => {
  await page.goto('/#atelier/fiche')
  await expect(page.locator('.verdict')).toContainText('Tout concorde')
  await page.getByLabel('IRSA sur la fiche').fill('100000')
  await expect(page.locator('.verdict')).toContainText('1 écart')
  await expect(page.locator('.studio-table tr[data-gap]')).toHaveCount(1)
})

test('hire: the budget turns into a salary that fits it', async ({ page }) => {
  await page.goto('/#atelier/embaucher')
  await page.getByLabel('Votre budget total pour ce poste, par mois').fill('2000000')
  await expect(page.locator('.verdict')).toContainText(digits(1_680_672))
})

test('team: roles add up', async ({ page }) => {
  await page.goto('/#atelier/equipe')
  await expect(page.locator('.verdict')).toContainText(digits(1_190_000))
  await page.getByLabel('Effectif').fill('3')
  await expect(page.locator('.verdict')).toContainText(digits(3_570_000))
  await page.getByRole('button', { name: 'Ajouter un poste' }).click()
  await expect(page.locator('.studio-table tbody tr')).toHaveCount(2)
})

test('year: twelve months add up, and a single month can change', async ({ page }) => {
  await page.goto('/#atelier/annee')
  await expect(page.locator('.verdict')).toContainText(digits(10_518_000))
  await page.getByLabel('Brut du mois 12').fill('2000000')
  await expect(page.locator('.verdict')).not.toContainText(digits(10_518_000))
})

test('end of contract: the three indemnities', async ({ page }) => {
  await page.goto('/#atelier/fin')
  await expect(page.locator('.verdict')).toContainText(digits(2_500_000))
  await page.getByRole('combobox', { name: 'Comment le contrat se termine-t-il ?' }).click()
  await page.getByRole('option', { name: /Démission/ }).click()
  await expect(page.locator('.verdict')).toContainText(digits(1_500_000))
  await page.getByRole('combobox', { name: 'Le préavis est-il travaillé ?' }).click()
  await page.getByRole('option', { name: /Oui/ }).click()
  await expect(page.locator('.verdict')).toContainText(digits(500_000))
})

test('save, reload, reopen, delete', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  await page.getByLabel('Salaire de base mensuel').nth(1).fill('1700000')
  await page.getByRole('button', { name: 'Enregistrer et partager' }).click()
  await page.getByLabel('Nom de la simulation').fill('Ma comparaison test')
  await page.getByRole('button', { name: 'Enregistrer sur cet appareil' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'enregistrée' })).toBeVisible()

  await page.getByLabel('Salaire de base mensuel').nth(1).fill('1100000')
  await page.goto('/#atelier/sauvegardes')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ma comparaison test' })).toBeVisible()
  await page.getByRole('button', { name: /Ouvrir Ma comparaison test/ }).click()
  await page.goto('/#atelier/comparer')
  await expect(page.getByLabel('Salaire de base mensuel').nth(1)).toHaveValue(digits(1_700_000))
  await page.goto('/#atelier/sauvegardes')
  await page.getByRole('button', { name: /Supprimer Ma comparaison test/ }).click()
  await expect(page.getByRole('heading', { name: 'Ma comparaison test' })).toHaveCount(0)
})

test('the workshop remembers the draft after a reload', async ({ page }) => {
  await page.goto('/#atelier/embaucher')
  await page.getByLabel('Votre budget total pour ce poste, par mois').fill('3000000')
  await page.reload()
  await expect(page.getByLabel('Votre budget total pour ce poste, par mois')).toHaveValue(digits(3_000_000))
})

test('exports: CSV downloads', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  await page.getByRole('button', { name: 'Enregistrer et partager' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Télécharger en tableur/ }).click()
  expect((await download).suggestedFilename()).toBe('karama-comparer.csv')
})

test('an invalid shared link is refused and the local workshop is kept', async ({ page }) => {
  await page.goto('/#atelier/comparer/%7B%22version%22%3A2%7D')
  await expect(page.getByRole('alert').filter({ hasText: 'lien partagé est invalide' })).toBeVisible()
  await expect(page.locator('.verdict')).toBeVisible()
})
