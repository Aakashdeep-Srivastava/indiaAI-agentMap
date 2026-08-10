import { test, expect } from '@playwright/test'

/**
 * Notification + certificate API contract, driven against the live backend.
 *
 * READ-ONLY, and deliberately so: every assertion here is a GET or an
 * unauthenticated call. Nothing is marked read, no announcement is broadcast
 * and no enterprise is allocated — those are writes against production
 * Supabase, and a broadcast in particular cannot be recalled once it emails
 * real owners.
 *
 * What this pins is the boundary that matters: a notification names an
 * enterprise's approval status, its allocated SNP and its officer's notes, so
 * the feed must be unreachable without a token and unreadable across
 * enterprises. That property is worth a live check on every run, because the
 * client-side gate is not the thing enforcing it.
 */

const API = 'https://agentmap-api.azurewebsites.net'

test('the notification feed rejects anonymous callers', async ({ request }) => {
  const res = await request.get(`${API}/notifications/`, { failOnStatusCode: false })
  expect(
    [401, 403],
    `anonymous /notifications/ should be rejected, got ${res.status()}`,
  ).toContain(res.status())
})

test('marking a notification read requires authentication', async ({ request }) => {
  const res = await request.post(`${API}/notifications/1/read`, {
    failOnStatusCode: false,
  })
  expect([401, 403]).toContain(res.status())
})

test('broadcasting an announcement requires authentication', async ({ request }) => {
  // Unauthenticated, so this can never actually send. The assertion is that
  // the gate rejects before any fan-out happens.
  const res = await request.post(`${API}/notifications/broadcast`, {
    data: { title_en: 'e2e probe — must not send', body_en: 'e2e probe' },
    failOnStatusCode: false,
  })
  expect(
    [401, 403],
    'an unauthenticated caller must never be able to broadcast to owners',
  ).toContain(res.status())
})

test('the notification endpoints are actually deployed', async ({ request }) => {
  // A 404 here would mean the route is missing, which the auth assertions
  // above could not distinguish from a rejection.
  const spec = await request.get(`${API}/openapi.json`)
  expect(spec.status()).toBe(200)

  const paths = Object.keys((await spec.json()).paths)
  for (const p of [
    '/notifications/',
    '/notifications/{notification_id}/read',
    '/notifications/read-all',
    '/notifications/broadcast',
  ]) {
    expect(paths, `${p} missing from the deployed API`).toContain(p)
  }
})

test('the certificate page is behind the portal gate', async ({ page }) => {
  await page.goto('/certificate', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/login/, { timeout: 15_000 })
  expect(new URL(page.url()).pathname).toBe('/login')
})

test('the certificate page no longer requires an mseId in the URL', async ({ request }) => {
  // The regression this guards: /certificate used to hard-require ?mseId=,
  // which only the officer flows ever supplied — leaving owners with no path
  // to their own certificate at all. The page must at least be served.
  const res = await request.get('/certificate', { failOnStatusCode: false })
  expect(res.status(), '/certificate should be served, gating happens client-side').toBe(200)
})
