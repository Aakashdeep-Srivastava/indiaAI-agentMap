import { test, expect, type Page } from '@playwright/test'

/**
 * Public marketing surface — does every page actually render for a first-time
 * visitor, on desktop and on a phone? Read-only: navigation and assertions
 * only.
 */

const MARKETING_ROUTES = [
  '/',
  '/blog',
  '/ondc',
  '/dpdp',
  '/sovereign-ai',
  '/privacy',
  '/terms',
] as const

// Browser noise that says nothing about our code. Anything else that reaches
// console.error is treated as a real defect.
const BENIGN_CONSOLE = [
  /favicon/i,
  /net::ERR_INTERNET_DISCONNECTED/,
  /Download the React DevTools/i,
]

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (BENIGN_CONSOLE.some((re) => re.test(text))) return
    errors.push(text)
  })
  page.on('pageerror', (err) => errors.push(`uncaught: ${err.message}`))
  return errors
}

for (const route of MARKETING_ROUTES) {
  test(`${route} renders without errors`, async ({ page }) => {
    const errors = collectConsoleErrors(page)

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.status(), `HTTP status for ${route}`).toBe(200)

    // A page that returns 200 but renders an error boundary is still broken.
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveTitle(/MSMEMate/i)

    // Exactly one h1 per page — the structure screen readers and search
    // engines both rely on.
    const h1s = page.locator('h1')
    expect(await h1s.count(), `h1 count on ${route}`).toBe(1)
    await expect(h1s.first()).not.toBeEmpty()

    // Language must be declared for assistive tech and for correct rendering
    // of the bilingual EN/HI copy.
    await expect(page.locator('html')).toHaveAttribute('lang', /en/i)

    expect(errors, `console errors on ${route}`).toEqual([])
  })
}

test('landing page shows the primary calls to action', async ({ page }) => {
  await page.goto('/')

  // The two entry points the whole product funnels into.
  await expect(
    page.getByRole('link', { name: /register|get started|shuru/i }).first(),
  ).toBeVisible()

  // Footer is the trust surface — legal links must be reachable from the
  // landing page without hunting.
  await expect(page.getByRole('link', { name: /privacy/i }).first()).toBeVisible()
})

test('no page scrolls horizontally on a phone', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile viewports only')

  for (const route of MARKETING_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    // A few px of rounding is tolerable; a real overflow is not.
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(2)
  }
})

test('every image carries alt text', async ({ page }) => {
  await page.goto('/')
  const missing = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.hasAttribute('alt'))
      .map((img) => img.getAttribute('src') ?? '(no src)'),
  )
  expect(missing, 'images without an alt attribute').toEqual([])
})

test('a blog post renders its article body', async ({ page }) => {
  await page.goto('/blog')

  const firstPost = page.locator('a[href^="/blog/"]').first()
  await expect(firstPost).toBeVisible()
  await firstPost.click()

  await page.waitForURL(/\/blog\/.+/)
  await expect(page.locator('h1')).toBeVisible()
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(500)
})

test('a city cluster page renders', async ({ page }) => {
  await page.goto('/ondc')

  const firstCity = page.locator('a[href^="/ondc/"]').first()
  await expect(firstCity).toBeVisible()
  await firstCity.click()

  await page.waitForURL(/\/ondc\/.+/)
  await expect(page.locator('h1')).toBeVisible()
})
