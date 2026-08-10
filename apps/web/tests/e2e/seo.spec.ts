import { test, expect, request as playwrightRequest } from '@playwright/test'

/**
 * SEO and structured-data contract. The marketing site's whole job is to be
 * found, so metadata regressions are silent revenue/reach bugs — these assert
 * the pieces that no visual check would catch.
 */

test('sitemap.xml lists every public URL and nothing private', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)

  const xml = await res.text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  // 7 static + 7 blog posts + /ondc + 24 city pages, plus any newer additions.
  expect(urls.length).toBeGreaterThanOrEqual(39)

  // Duplicates dilute crawl budget and signal a generator bug.
  expect(new Set(urls).size, 'duplicate <loc> entries').toBe(urls.length)

  // Portal routes handle real enterprise data — they must never be advertised.
  const PRIVATE = [
    '/classify', '/match', '/review', '/audit', '/allocate',
    '/catalogue', '/certificate', '/upload', '/login', '/claims',
    '/model-health',
  ]
  for (const path of PRIVATE) {
    expect(
      urls.some((u) => new URL(u).pathname === path),
      `${path} must not appear in sitemap.xml`,
    ).toBe(false)
  }
})

test('robots.txt disallows every authenticated portal route', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)

  const body = await res.text()
  expect(body).toMatch(/Sitemap:\s*https:\/\/www\.msmemate\.com\/sitemap\.xml/i)

  const disallowed = [...body.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1])

  // Every admin-gated or session-gated route. /claims and /model-health are
  // included deliberately: both are admin-only surfaces, so leaving them
  // crawlable advertises their existence to anyone reading robots.txt.
  const MUST_DISALLOW = [
    '/classify', '/match', '/catalogue', '/review', '/audit',
    '/allocate', '/certificate', '/upload', '/login',
    '/claims', '/model-health',
  ]
  const missing = MUST_DISALLOW.filter((p) => !disallowed.includes(p))
  expect(missing, 'admin/portal routes missing from robots.txt Disallow').toEqual([])
})

test('every sitemap URL resolves — no broken links', async ({ baseURL }) => {
  const ctx = await playwrightRequest.newContext({ baseURL })
  const xml = await (await ctx.get('/sitemap.xml')).text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  const broken: string[] = []
  // Sequential on purpose: this walks ~40 live pages and we would rather be
  // slow than look like a burst of traffic to the rate limiter.
  for (const url of urls) {
    const res = await ctx.get(url, { maxRedirects: 2 })
    if (res.status() !== 200) broken.push(`${res.status()} ${url}`)
  }
  await ctx.dispose()

  expect(broken, 'sitemap URLs not returning 200').toEqual([])
})

test('home page carries valid sitewide JSON-LD', async ({ page }) => {
  await page.goto('/')

  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()
  expect(blocks.length, 'JSON-LD blocks on /').toBeGreaterThan(0)

  const types = new Set<string>()
  for (const raw of blocks) {
    // Malformed JSON-LD is worse than none — search engines drop the whole
    // block silently, so parse failure must fail the test.
    const parsed = JSON.parse(raw)
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node['@type']) types.add(node['@type'])
      expect(node['@context']).toMatch(/schema\.org/)
    }
  }

  expect([...types]).toEqual(
    expect.arrayContaining(['Organization', 'WebSite']),
  )
})

test('a blog post carries Article structured data', async ({ page }) => {
  await page.goto('/blog')
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute('href')
  await page.goto(href!)

  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()

  const types = blocks.flatMap((raw) => {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((n) => n['@type'])
  })
  expect(types).toContain('Article')
})

const META_ROUTES = ['/', '/blog', '/ondc', '/dpdp', '/sovereign-ai'] as const

for (const route of META_ROUTES) {
  test(`${route} has complete social + description metadata`, async ({ page }) => {
    await page.goto(route)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveCount(1)
    const desc = await description.getAttribute('content')
    expect(desc?.length ?? 0, `description length on ${route}`).toBeGreaterThan(50)

    // Open Graph drives every WhatsApp/LinkedIn share — an MSME audience
    // reaches this site through exactly those channels.
    for (const prop of ['og:title', 'og:description', 'og:type']) {
      await expect(
        page.locator(`meta[property="${prop}"]`),
        `${prop} on ${route}`,
      ).toHaveCount(1)
    }
  })
}

test('llms.txt is served for AI answer engines', async ({ request }) => {
  const res = await request.get('/llms.txt')
  expect(res.status()).toBe(200)
  expect((await res.text()).toLowerCase()).toContain('msmemate')
})
