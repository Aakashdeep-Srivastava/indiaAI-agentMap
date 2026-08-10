import { test, expect } from '@playwright/test'

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

for (const route of GATED_ROUTES) {
  test(`${route} redirects an anonymous visitor to /login`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })

    // The gate runs client-side after hydration, so wait for the redirect
    // rather than asserting the URL immediately.
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(new URL(page.url()).pathname).toBe('/login')
  })
}

test('/register stays public — it is the voice-first entry point', async ({ page }) => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' })

  // Give any stray redirect the same window the gated routes get, then assert
  // we are still on /register.
  await page.waitForTimeout(3_000)
  expect(new URL(page.url()).pathname).toBe('/register')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('/dashboard redirects to the match page', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
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
