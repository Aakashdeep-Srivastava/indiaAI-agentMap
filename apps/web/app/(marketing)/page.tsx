import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO (SASC-style: full-bleed dark, left-aligned)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative z-0 mx-4 min-h-[92vh] overflow-hidden rounded-b-[2rem] bg-brand-900 sm:mx-6 lg:mx-8">
        {/* Rich dark background — works standalone, enhanced with hero-bg.jpg if present */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "url('/hero-bg.jpg'), linear-gradient(135deg, #060a1e 0%, #0B1437 30%, #1a2a5e 60%, #0d1c4a 100%)",
            backgroundSize: "cover, cover",
            backgroundPosition: "center 40%, center",
          }}
        />
        {/* Dark overlay for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        {/* Warm glow accent (bottom-right, like ambient light in SASC) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 75% 80%, rgba(232,104,12,0.08) 0%, transparent 50%), radial-gradient(ellipse at 20% 30%, rgba(27,79,204,0.1) 0%, transparent 50%)",
          }}
        />
        {/* Bottom vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Hero content — left-aligned */}
        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl items-end px-6 pb-20 pt-32 sm:items-center sm:pb-0 sm:pt-0">
          <div className="max-w-3xl">
            {/* Pill badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <svg className="h-3.5 w-3.5 text-saffron-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs font-medium text-white/80">
                Built for India&apos;s 6.3 crore MSMEs
              </span>
            </div>

            {/* Main heading */}
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]">
              AI that{" "}
              <em className="not-italic" style={{
                fontFamily: "'Plus Jakarta Sans', serif",
                fontStyle: "italic",
                color: "transparent",
                backgroundImage: "linear-gradient(135deg, #FFA942 0%, #E8680C 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                paddingRight: "0.05em",
              }}>
                bridges
              </em>{" "}
              Bharat&apos;s Businesses.
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
              The sovereign AI platform that onboards MSEs to ONDC — through
              voice, in any Indian language. From registration to matching,
              everything in one place.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-brand-900 shadow-lg transition-all hover:bg-surface-50 hover:shadow-xl"
              >
                Get Started
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                href="/match"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — PERSONA TABS (white bg, like Criteo's
          Advertisers/Retailers/Media Owners showcase)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-b border-surface-200 bg-white py-16" id="solutions">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-saffron-500">
            Who It&apos;s For
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            Built for every stakeholder on ONDC
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-surface-600">
            Whether you&apos;re a small business owner, a network partner,
            or a government officer — AgentMap AI makes your workflow faster.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* MSE Owners */}
            <div className="group rounded-2xl border border-surface-200 bg-surface-50/50 p-6 transition-all hover:border-brand-200 hover:shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-brand-900">
                MSE Owners
              </h3>
              <p className="mt-1 text-xs font-medium text-surface-400">
                Shopkeepers, artisans, manufacturers
              </p>
              <p className="mt-3 text-sm leading-relaxed text-surface-600">
                Register using your voice in any of 11 Indian languages.
                We classify your products and find the best selling
                partner for your location and category — no forms, no jargon.
              </p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-700"
              >
                Register now
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>

            {/* SNPs */}
            <div className="group rounded-2xl border border-surface-200 bg-surface-50/50 p-6 transition-all hover:border-saffron-200 hover:shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #E8680C, #FFA942)" }}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-brand-900">
                Seller Network Participants
              </h3>
              <p className="mt-1 text-xs font-medium text-surface-400">
                ONDC network partners
              </p>
              <p className="mt-3 text-sm leading-relaxed text-surface-600">
                Receive pre-verified, accurately categorized sellers
                matched to your domain and geography. Fewer mismatches,
                fewer re-assignments, faster onboarding.
              </p>
              <Link
                href="/match"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-500 transition-colors hover:text-saffron-700"
              >
                View matches
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>

            {/* NSIC */}
            <div className="group rounded-2xl border border-surface-200 bg-surface-50/50 p-6 transition-all hover:border-emerald-200 hover:shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#138808] text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-brand-900">
                NSIC Officers
              </h3>
              <p className="mt-1 text-xs font-medium text-surface-400">
                Reviewers &amp; administrators
              </p>
              <p className="mt-3 text-sm leading-relaxed text-surface-600">
                AI handles routine verifications so you can focus on edge
                cases. Every recommendation comes with a clear confidence
                indicator, full audit trail, and override controls.
              </p>
              <Link
                href="/review"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-800"
              >
                Review queue
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — HOW IT WORKS (journey, like Criteo's
          "Engage shoppers across their entire journey")
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-saffron-500">
            How It Works
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            From registration to selling — in minutes
          </h2>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-surface-200 bg-surface-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Register",
                desc: "Enter your Udyam number and describe what you sell — by voice or text, in your language.",
                link: { label: "Start registration", href: "/register" },
                color: "text-brand-500",
              },
              {
                step: "02",
                title: "Categorize",
                desc: "Our AI maps your products to the right ONDC category — sarees, spices, electronics, anything.",
                link: { label: "Learn more", href: "/#solutions" },
                color: "text-saffron-500",
              },
              {
                step: "03",
                title: "Match",
                desc: "Get matched with the best selling partner based on your products, location, and business size.",
                link: { label: "See matches", href: "/dashboard" },
                color: "text-[#138808]",
              },
              {
                step: "04",
                title: "Sell",
                desc: "Accept your match and you're on ONDC. Start reaching new customers across India.",
                link: { label: "Get started", href: "/register" },
                color: "text-brand-900",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col justify-between bg-white p-6"
              >
                <div>
                  <span className={`font-mono text-xs font-bold ${item.color}`}>
                    {item.step}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-bold text-brand-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-600">
                    {item.desc}
                  </p>
                </div>
                <a
                  href={item.link.href}
                  className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${item.color} transition-opacity hover:opacity-70`}
                >
                  {item.link.label}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — BEFORE / AFTER (like Criteo testimonial +
          stats, split layout)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-b border-surface-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-2xl border border-surface-200">
            <div className="grid lg:grid-cols-2">
              {/* Left — stat highlight */}
              <div className="flex flex-col justify-center bg-emerald-50 p-8 lg:p-10">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  The Impact
                </p>
                <p className="mt-3 font-display text-5xl font-extrabold text-emerald-700 lg:text-6xl">
                  &lt;8 min
                </p>
                <p className="mt-2 text-lg font-medium text-emerald-800">
                  Average registration time
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-surface-600">
                  &ldquo;The current TEAM portal process takes 30+ minutes
                  of manual form filling. With AI-powered voice registration,
                  MSEs complete onboarding in under 8 minutes — in their
                  own language.&rdquo;
                </p>
                <Link
                  href="/register"
                  className="btn-saffron mt-6 !w-fit !py-2.5 !px-6 !text-xs"
                >
                  Try it yourself
                </Link>
              </div>

              {/* Right — before/after list */}
              <div className="p-8 lg:p-10">
                <h3 className="font-display text-xl font-bold text-brand-900">
                  What changes for you
                </h3>
                <div className="mt-6 space-y-4">
                  {[
                    {
                      before: "Complex forms in English only",
                      after: "Voice input in 11 Indian languages",
                    },
                    {
                      before: "Manual product categorization",
                      after: "AI classifies instantly from description",
                    },
                    {
                      before: "Random partner assignment",
                      after: "Smart match by area, category & capacity",
                    },
                    {
                      before: "7-14 day verification wait",
                      after: "Automated checks, same-day clearance",
                    },
                    {
                      before: "No transparency on decisions",
                      after: "Plain-language explanation for every match",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-surface-50 p-3"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-3 w-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-surface-400 line-through">
                          {item.before}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <p className="text-sm font-medium text-brand-900">
                            {item.after}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — DARK STATS (like Criteo's "Our AI-powered
          technology" section with big numbers)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-brand-900 py-16 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 40%, rgba(27,79,204,0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(232,104,12,0.12) 0%, transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <p className="mb-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-saffron-400">
            Indian AI Infrastructure
          </p>
          <h2 className="mx-auto max-w-2xl text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Your data never leaves India.
            <br />
            <span className="text-brand-300">
              Our AI is built here, hosted here.
            </span>
          </h2>

          {/* Big stat boxes */}
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "11+", label: "Indian Languages", sub: "Voice & text support" },
              { value: "50+", label: "SNPs Mapped", sub: "Across 5 ONDC domains" },
              { value: "100%", label: "Indian Hosted", sub: "No foreign cloud dependency" },
              { value: "24/7", label: "Audit Trail", sub: "Every decision logged" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-brand-900/80 p-6 text-center backdrop-blur"
              >
                <p className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                  {item.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-saffron-400">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-brand-300">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Trust pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              "DPDP Act 2023 Compliant",
              "Sovereign AI Stack",
              "Encrypted at Rest & Transit",
              "Government-Ready Audit Logs",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — RESOURCES (like Criteo's "Stay in the know"
          blog cards)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-surface-50 py-16" id="resources">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-2 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-saffron-500">
            Getting Started
          </p>
          <h2 className="text-center font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            Resources to help you begin
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                tag: "MSE Guide",
                title: "How to Register Your Business on ONDC",
                desc: "Step-by-step walkthrough for first-time MSE owners — from Udyam number to your first match.",
                href: "/register",
                color: "bg-brand-500",
              },
              {
                tag: "SNP Guide",
                title: "Understanding Match Recommendations",
                desc: "How our matching works, what the scores mean, and how to manage your assigned sellers.",
                href: "/dashboard",
                color: "bg-saffron-500",
              },
              {
                tag: "NSIC Guide",
                title: "Review Queue & Audit Workflows",
                desc: "How to review flagged matches, override recommendations, and generate compliance reports.",
                href: "/review",
                color: "bg-[#138808]",
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-surface-200 bg-white p-6 transition-all hover:border-brand-200 hover:shadow-card"
              >
                <span
                  className={`inline-block rounded-md ${item.color} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}
                >
                  {item.tag}
                </span>
                <h3 className="mt-3 font-display text-base font-bold text-brand-900 group-hover:text-brand-500">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {item.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500">
                  Read more
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — CTA BANNER (like Criteo's gradient CTA strip)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-12" id="about">
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="relative overflow-hidden rounded-2xl px-8 py-10 text-white sm:px-12"
            style={{
              background:
                "linear-gradient(135deg, #0B1437 0%, #1B4FCC 50%, #E8680C 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative z-10 flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  Ready to take your business
                  <br className="hidden sm:block" /> onto ONDC?
                </h2>
                <p className="mt-2 max-w-lg text-sm text-white/70">
                  Join MSEs across India who are discovering new customers
                  through smarter, AI-powered partner matching.
                </p>
              </div>
              <Link href="/register" className="btn-saffron shrink-0 !py-3 !px-8">
                Register Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — THREE-COLUMN LINKS (like Criteo's
          Help Center / Careers / Press & Media)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-surface-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Help Center",
                desc: "Browse our guides for MSE registration, matching workflows, and troubleshooting.",
                link: "Get help",
              },
              {
                title: "For Developers",
                desc: "Explore our API documentation, data schemas, and ONDC integration guides.",
                link: "See API docs",
              },
              {
                title: "About the Team",
                desc: "AgentMap AI is built by Team XphoraAI for the IndiaAI Innovation Challenge 2026.",
                link: "Learn more",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-surface-200 p-6"
              >
                <h3 className="font-display text-base font-bold text-brand-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {item.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500">
                  {item.link}
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
