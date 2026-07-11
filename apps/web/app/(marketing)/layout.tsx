import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";

/* Sitewide structured data — feeds Google rich results and AI answer engines */
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MSMEMate",
    alternateName: "Team XphoraAI",
    legalName: "Xphora AI Technology Pvt Ltd",
    email: "aakashdeep@xphoraai.com",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-6394958060",
      contactType: "customer support",
      availableLanguage: ["en", "hi"],
    },
    url: "https://www.msmemate.com",
    logo: "https://www.msmemate.com/icon-512.png",
    slogan: "Bridging Bharat's Businesses",
    description:
      "AI-native onboarding platform that takes India's MSMEs from Udyam registration to selling on ONDC — voice-first, multilingual, DPDP-compliant.",
    foundingDate: "2026",
    areaServed: "IN",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MSMEMate",
    url: "https://www.msmemate.com",
    inLanguage: ["en-IN", "hi-IN"],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MSMEMate",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.msmemate.com",
    description:
      "Voice-first registration, ONDC taxonomy classification and seller-platform matching for Indian micro and small enterprises.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    inLanguage: ["en-IN", "hi-IN"],
  },
];

/* ── Footer link columns (warm heritage panel) ─────────────────── */
const FOOTER_COLUMNS: {
  title: string;
  items: { label: string; href: string | null; external?: boolean }[];
}[] = [
  {
    title: "Company",
    items: [
      { label: "About us", href: "/#about" },
      { label: "Our Mission", href: "/sovereign-ai" },
      { label: "Team XphoraAI", href: "/#about" },
      { label: "Careers", href: "mailto:aakashdeep@xphoraai.com", external: true },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "https://wa.me/916394958060", external: true },
      { label: "Documentation", href: null },
      { label: "API Reference", href: null },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "DPDP Compliance", href: "/dpdp" },
      { label: "Sovereign AI", href: "/sovereign-ai" },
    ],
  },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-jali">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
      />
      {/* ── Top tricolour accent ──────────────────────────────── */}
      <div className="tricolour-bar" />

      {/* ── Floating navbar ───────────────────────────────────── */}
      <Navbar />

      {/* ── Main content ───────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Heritage Footer ───────────────────────────────────── */}
      <footer className="border-t border-surface-200 bg-white">
        {/* Hero band — Bharat's entrepreneurs joined by the handshake M */}
        <div className="relative w-full overflow-hidden bg-[#f3e6cf]">
          <Image
            src="/footer-hero.webp"
            alt="Bharat's entrepreneurs — a farmer, weaver, kirana owner, delivery partner, professional and tailor — joined by the MSMEMate handshake"
            width={1814}
            height={575}
            sizes="100vw"
            className="h-auto w-full object-cover"
          />
        </div>

        {/* Link panel */}
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-x-8 gap-y-10 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr_1.1fr]">
            {/* Brand block */}
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-mark.png"
                  alt="MSMEMate — two entrepreneurs joining hands"
                  width={52}
                  height={52}
                  className="h-12 w-12 rounded-xl"
                />
                <div className="leading-tight">
                  <p className="font-display text-2xl font-extrabold tracking-tight">
                    <span className="text-brand-900">MSME</span>
                    <span className="text-saffron-500">Mate</span>
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-surface-400">
                    Bridging Bharat&rsquo;s Businesses
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-surface-600">
                Empowering Bharat&rsquo;s 6.3 crore MSMEs to grow, connect and
                thrive on ONDC through AI in every Indian language.
              </p>
              <p className="mt-6 text-xs text-surface-400">
                &copy; 2026 MSMEMate &middot; Made by Xphora AI Technology Pvt
                Ltd &middot; msmemate.com
              </p>
              <p className="mt-1 text-xs text-surface-400">All rights reserved.</p>
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="font-display text-sm font-bold text-brand-900">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {item.href === null ? (
                        <span
                          className="cursor-default text-sm text-surface-300"
                          title="Coming soon"
                        >
                          {item.label}
                        </span>
                      ) : item.external ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-sm text-surface-500 transition-colors hover:text-saffron-600"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="text-sm text-surface-500 transition-colors hover:text-saffron-600"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Connect with us */}
            <div>
              <h4 className="font-display text-sm font-bold text-brand-900">
                Connect with us
              </h4>
              <div className="mt-4 flex items-center gap-2.5">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/916394958060"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with MSMEMate on WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-400 text-white transition-colors hover:bg-[#25D366]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                {/* Email */}
                <a
                  href="mailto:aakashdeep@xphoraai.com"
                  aria-label="Email MSMEMate"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-400 text-white transition-colors hover:bg-brand-500"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 5L2 7" />
                  </svg>
                </a>
                {/* LinkedIn — handle pending */}
                <span
                  title="LinkedIn — coming soon"
                  className="flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-surface-200 text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 11.002-4.124 2.062 2.062 0 01-.002 4.124zM7.119 20.452H3.555V9h3.564v11.452z" />
                  </svg>
                </span>
                {/* YouTube — handle pending */}
                <span
                  title="YouTube — coming soon"
                  className="flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-surface-200 text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </span>
              </div>

              {/* Made in India */}
              <p className="mt-7 font-display text-sm font-bold text-brand-900">
                Made in India
              </p>
              <span className="mt-2 inline-flex h-1 w-16 overflow-hidden rounded-full border border-surface-200">
                <span className="w-1/3 bg-[#FF9933]" />
                <span className="w-1/3 bg-white" />
                <span className="w-1/3 bg-[#138808]" />
              </span>
              <p className="mt-2 text-sm font-medium text-surface-500">
                For Bharat. By Bharat.
              </p>
            </div>
          </div>
        </div>

        {/* Ornamental base strip */}
        <div
          className="h-6 border-t border-surface-200"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 7l5 5-5 5-5-5z' fill='none' stroke='%23cdd3e4' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "24px 24px",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "center",
          }}
        />
        <div className="tricolour-bar" />
      </footer>
    </div>
  );
}
