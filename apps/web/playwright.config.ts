import { defineConfig, devices } from '@playwright/test'

/**
 * Production smoke suite — READ-ONLY.
 *
 * These tests drive the live site at https://www.msmemate.com. They navigate
 * and assert only: no form is submitted, no account is created, nothing is
 * written. Keep it that way — the API this frontend talks to is backed by the
 * production Supabase instance, so a stray POST would create real MSE rows.
 *
 * Override the target with E2E_BASE_URL to run against a preview deployment
 * or a local `npm run dev`.
 *
 *   npx playwright test                       # full suite
 *   npx playwright test --project=mobile      # mobile viewport only
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://www.msmemate.com'

export default defineConfig({
  testDir: './tests/e2e',
  // Modest parallelism: this points at a live single-instance App Service
  // backend, so we stay well clear of the rate limiter.
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Identify ourselves in the live access logs rather than masquerading
    // as an ordinary visitor.
    userAgent:
      'MSMEMate-E2E/1.0 (+https://www.msmemate.com; Playwright smoke suite)',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // WebKit is the engine every iOS browser is required to use, so it is the
    // one that can fail while Chromium passes. Firefox catches standards
    // assumptions Blink is lenient about.
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
})
