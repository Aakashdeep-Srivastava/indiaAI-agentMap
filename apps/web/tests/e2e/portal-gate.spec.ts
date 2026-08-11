import { test, expect, type Page } from '@playwright/test'

/**
 * Access control as an anonymous visitor.
 *
 * READ-ONLY: these tests never submit the login form or register anything.
 * The client-side gate is a UX affordance, not the security boundary — the
 * API re-authorises every request — but a gate that stops redirecting would
 * still flash enterprise data on screen, so it is worth pinning.
 */

// Every route behind the portal session gate.
const GATED_ROUTES = [
  '/classify',
  '/match',
  '/catalogue',
  '/certificate',
  '/upload',
  '/review',
  '/allocate',
  '/claims',
  '/audit',
  '/model-health',
] as const

/* The gate is client-side: it cannot run until the JS bundle has downloaded
 * and React has hydrated. `domcontentloaded` fires BEFORE the bundle is
 * fetched, so starting the redirect clock there measures download time plus
 * hydration plus redirect — and on a cold serverless start (the first request
 * after a deploy) the download alone can consume most of the window. That is
 * what made this suite intermittently red against production while the page
 * itself was fine.
 *
 * Waiting for `load` first means the clock below measures only what the test
 * actually cares about: whether the gate redirects once it is able to run.
 * The redirect frequently fires *during* load, which aborts the pending
 * waitForLoadState — hence the catch, since that is success, not failure. */
async function gotoAndSettle(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
}

for (const route of GATED_ROUTES) {
  test(`${route} redirects an anonymous visitor to /login`, async ({ page }) => {
    await gotoAndSettle(page, route)

    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(new URL(page.url()).pathname).toBe('/login')
  })
}

test('/register stays public — it is the voice-first entry point', async ({ page }) => {
  await gotoAndSettle(page, '/register')

  // Give any stray redirect a window to happen, then assert we are still here.
  // Measured from `load` for the same reason as above: before the bundle has
  // hydrated, "no redirect yet" proves nothing.
  await page.waitForTimeout(3_000)
  expect(new URL(page.url()).pathname).toBe('/register')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('/dashboard redirects to the match page', async ({ page }) => {
  await gotoAndSettle(page, '/dashboard')
  // Unauthenticated, so it lands on /login via /match — either is acceptable,
  // what matters is that it does not 404.
  await page.waitForURL(/\/(login|match)/, { timeout: 15_000 })
})

test('login page ships no credentials in the client bundle', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('form, input')).not.toHaveCount(0)

  // Demo passcodes must never be embedded in shipped JS — the login page is
  // world-readable and this is a government platform.
  const html = await page.content()
  expect(html).not.toMatch(/bharat123|nsic123/i)
})

test('an unknown URL renders the 404 page, not a crash', async ({ page }) => {
  const res = await page.goto('/this-route-does-not-exist-e2e', {
    waitUntil: 'domcontentloaded',
  })
  expect(res?.status()).toBe(404)
  // not-found.tsx is bilingual — assert it actually rendered.
  await expect(page.locator('body')).toContainText(/not found|404|नहीं/i)
})

test('the API is reachable and reports healthy', async ({ request }) => {
  const res = await request.get(
    'https://agentmap-api.azurewebsites.net/health',
  )
  expect(res.status()).toBe(200)
  expect(await res.json()).toMatchObject({ status: 'ok' })
})

test('admin-only API routes reject anonymous callers', async ({ request }) => {
  // Confirms the real boundary: the server, not the client gate.
  for (const path of ['/audit/', '/model-health/', '/claims/queue']) {
    const res = await request.get(
      `https://agentmap-api.azurewebsites.net${path}`,
      { failOnStatusCode: false },
    )
    expect(
      [401, 403],
      `${path} should reject anonymous access, got ${res.status()}`,
    ).toContain(res.status())
  }
})
