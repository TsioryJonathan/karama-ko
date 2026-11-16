import { expect, test as base } from '@playwright/test'

/** Every test fails on a console error or an uncaught exception: a page that logs one is broken. */
export const test = base.extend<{ ignoreErrors: RegExp[] }>({
  // Errors a test provokes on purpose (a refused request logs one in the browser console).
  ignoreErrors: [[], { option: true }],
  page: async ({ page, ignoreErrors }, use) => {
    const problems: string[] = []
    let missing = false
    page.on('response', (response) => {
      if (response.status() === 404 && response.request().resourceType() === 'document') missing = true
    })
    page.on('pageerror', (error) => problems.push(`exception: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`)
    })
    await use(page)
    // The browser reports the HTTP 404 of an address that does not exist: expected only after such a page was asked for.
    const real = problems.filter((p) => !ignoreErrors.some((re) => re.test(p)) && !(missing && /status of 404/.test(p)))
    expect(real, 'the page logged errors').toEqual([])
  },
})
export { expect }

/** « 1 268 500 Ar » with any kind of space between the groups. */
export const ar = (n: number) => new RegExp(n.toLocaleString('fr-FR').replace(/[\s  ]/g, '[\\s\\u202f\\u00a0]') + '[\\s\\u00a0]Ar')
export const digits = (n: number) => new RegExp(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u202f\\u00a0]'))
