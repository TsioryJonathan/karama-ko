import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** The assistant's server side is covered by the API tests; here the page is tested against a fake server. */
async function fakeAssistant(page: Page, reply: (body: Record<string, unknown>) => { status: number; body: unknown }) {
  const asked: Record<string, unknown>[] = []
  await page.route('**/api/health', (route) => route.fulfill({ json: { aiConfigured: true } }))
  await page.route('**/api/assistant', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    asked.push(body)
    const { status, body: json } = reply(body)
    await route.fulfill({ status, json })
  })
  return asked
}

test('without a configured assistant, the page says so and the tools still work', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  await expect(page.getByText('n’est pas connecté')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Envoyer la question' })).toBeDisabled()
  await expect(page.locator('.verdict')).toBeVisible()
})

test('it knows what you did, and answers a suggested question', async ({ page }) => {
  const asked = await fakeAssistant(page, () => ({ status: 200, body: { answer: 'Votre net augmente parce que…' } }))
  await page.goto('/#atelier/comparer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  const dialog = page.getByRole('complementary', { name: 'Vos questions' })
  await expect(dialog).toContainText('Poste actuel')
  await expect(dialog).toContainText('Nouvelle offre')
  await dialog.getByRole('button', { name: /écarts de net/ }).click()
  await expect(dialog).toContainText('Votre net augmente parce que')
  expect(asked).toHaveLength(1)
  expect(asked[0]).toMatchObject({ tool: 'comparer', question: expect.stringContaining('écarts de net') })
  expect((asked[0].scenarios as unknown[]).length).toBe(2)
})

test('« Pourquoi ce résultat ? » asks at once, with the figures of the tool', async ({ page }) => {
  const asked = await fakeAssistant(page, () => ({ status: 200, body: { answer: 'Voici pourquoi.' } }))
  await page.goto('/#atelier/negocier')
  await page.getByRole('button', { name: 'Pourquoi ce résultat ?' }).click()
  await expect(page.getByRole('complementary', { name: 'Vos questions' })).toContainText('Voici pourquoi.')
  expect(asked[0]).toMatchObject({ tool: 'negocier' })
  expect((asked[0].scenarios as { gross: number }[]).map((s) => s.gross)).toEqual([1_000_000, 1_191_306])
})

test('the assistant is available in every tool', async ({ page }) => {
  for (const hash of ['comparer', 'negocier', 'explorer', 'fiche', 'embaucher', 'equipe', 'annee', 'fin', 'sauvegardes', 'integrer'])
    await test.step(hash, async () => {
      await page.goto(`/#atelier/${hash}`)
      await expect(page.getByRole('button', { name: 'Poser une question' })).toBeVisible()
    })
  await page.goto('/?brut=1000000#calculateur')
  await expect(page.getByRole('button', { name: 'Poser une question' })).toBeVisible()
})

test.describe('refusals', () => {
  test.use({ ignoreErrors: [/status of 429/] })
  test('limits and failures are shown in words, not as a blank', async ({ page }) => {
  await fakeAssistant(page, () => ({ status: 429, body: { error: 'Trop de demandes. Réessayez dans une minute.' } }))
  await page.goto('/#atelier/explorer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  await page.getByRole('button', { name: 'Envoyer la question' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Trop de demandes' })).toBeVisible()
  })
})

test('changing tool starts a fresh conversation', async ({ page }) => {
  await fakeAssistant(page, () => ({ status: 200, body: { answer: 'Réponse du premier outil.' } }))
  await page.goto('/#atelier/explorer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  await page.getByRole('button', { name: 'Envoyer la question' }).click()
  await expect(page.getByText('Réponse du premier outil.')).toBeVisible()
  await page.getByRole('button', { name: 'Mon salaire' }).click()
  await page.getByRole('link', { name: /Comparer des offres/ }).click()
  await expect(page.getByText('Réponse du premier outil.')).toHaveCount(0)
})

test('Escape closes the panel', async ({ page }) => {
  await page.goto('/#atelier/comparer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  await expect(page.getByRole('complementary', { name: 'Vos questions' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: 'Vos questions' })).toBeHidden()
})

test('the question you sent stays as it was while you type the next one', async ({ page }) => {
  await fakeAssistant(page, () => ({ status: 200, body: { answer: 'Bonjour.' } }))
  await page.goto('/#atelier/comparer')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  const field = page.getByLabel('Votre question')
  await field.fill('hello')
  await page.getByRole('button', { name: 'Envoyer la question' }).click()
  const sent = page.locator('.assistant-asked')
  await expect(sent).toHaveText('hello')
  await expect(field).toHaveValue('')
  await field.fill('une autre question en cours de frappe')
  await expect(sent).toHaveText('hello')
})

test('the answer is laid out: bold, lists, a table; nothing runs', async ({ page }) => {
  await fakeAssistant(page, () => ({
    status: 200,
    body: {
      answer:
        'Votre net passe à **1 026 500 Ar**.\n\n- le brut augmente\n- l’IRSA aussi\n\n| Ligne | Montant |\n|---|---|\n| CNaPS | 11 913 |\n\n<img src=x onerror="window.pwned=1">',
    },
  }))
  await page.goto('/#atelier/negocier')
  await page.getByRole('button', { name: 'Pourquoi ce résultat ?' }).click()
  const answer = page.locator('.assistant-answer .md')
  await expect(answer.locator('strong')).toHaveText('1 026 500 Ar')
  await expect(answer.locator('ul li')).toHaveCount(2)
  await expect(answer.locator('table td').first()).toHaveText('CNaPS')
  await expect(answer).toContainText('<img src=x')
  expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined()
})

test('a request to change the form is done by the page, not guessed by the model', async ({ page }) => {
  const asked = await fakeAssistant(page, () => ({ status: 200, body: { answer: 'ne doit pas être appelé' } }))
  await page.goto('/?brut=1500000#calculateur')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  const dialog = page.getByRole('complementary', { name: 'Vos questions' })
  await dialog.getByLabel('Votre question').fill('si j’ai 20h de suppl combien sera mon salaire ?')
  await dialog.getByRole('button', { name: 'Envoyer la question' }).click()
  await expect(dialog).toContainText('C’est renseigné dans le formulaire')
  await expect(dialog).toContainText('20 h supplémentaires')
  await expect(dialog).toContainText('Net après')
  expect(asked).toHaveLength(0)
  // The form itself now holds the hours.
  await page.getByRole('button', { name: /Primes, heures supplémentaires/ }).click()
  await expect(page.getByLabel('Premières heures')).toHaveValue('20')
})

test('earlier questions and answers stay on screen', async ({ page }) => {
  let n = 0
  await fakeAssistant(page, () => ({ status: 200, body: { answer: `Réponse numéro ${++n}` } }))
  await page.goto('/?brut=1500000#calculateur')
  await page.getByRole('button', { name: 'Poser une question' }).click()
  const dialog = page.getByRole('complementary', { name: 'Vos questions' })
  for (const question of ['première question', 'deuxième question']) {
    await dialog.getByLabel('Votre question').fill(question)
    await dialog.getByRole('button', { name: 'Envoyer la question' }).click()
    await expect(dialog).toContainText(question)
  }
  await expect(dialog).toContainText('première question')
  await expect(dialog).toContainText('Réponse numéro 1')
  await expect(dialog).toContainText('Réponse numéro 2')
})
