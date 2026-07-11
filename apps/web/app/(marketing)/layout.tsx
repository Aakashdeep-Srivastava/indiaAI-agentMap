import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterIllustration from "@/components/FooterIllustration";

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

      {/* ── Mega Footer ────────────────────────────────────────── */}
      <footer className="border-t border-surface-200 bg-white">
        {/* Link columns */}
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Product */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-900">
                Product
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "MSE Registration", href: "/register" },
                  { label: "Classification", href: "/classify" },
                  { label: "Match Dashboard", href: "/match" },
                  { label: "Review Queue", href: "/review" },
                  { label: "Audit Trail", href: "/audit" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-surface-500 transition-colors hover:text-brand-500"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-900">
                Solutions
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  "For MSE Owners",
                  "For Seller Network Participants",
                  "For NSIC Officers",
                  "ONDC Integration",
                ].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-surface-500">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-900">
                Resources
              </h4>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-surface-500 transition-colors hover:text-brand-500"
                  >
                    Blog — ONDC &amp; MSME Guides
                  </Link>
                </li>
                {[
                  "Documentation",
                  "API Reference",
                  "ONDC Taxonomy",
                  "Help Center",
                ].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-surface-500">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-900">
                About
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Team XphoraAI", href: null },
                  { label: "IndiaAI Challenge 2026", href: null },
                  { label: "DPDP Compliance", href: "/dpdp" },
                  { label: "Sovereign AI", href: "/sovereign-ai" },
                ].map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-sm text-surface-500 transition-colors hover:text-brand-500"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-surface-500">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Contact */}
              <h4 className="mt-8 font-display text-xs font-bold uppercase tracking-wider text-brand-900">
                Contact
              </h4>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href="https://wa.me/916394958060"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-[#25D366]"
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp: +91 63949 58060
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:aakashdeep@xphoraai.com"
                    className="inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-brand-500"
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 5L2 7" />
                    </svg>
                    aakashdeep@xphoraai.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Engine-style illustration band ──────────────────── */}
        <FooterIllustration />

        {/* Bottom bar */}
        <div className="border-t border-surface-200">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-5 sm:flex-row">
            {/* Logo + copyright */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-mark.png"
                alt="MSMEMate — two entrepreneurs joining hands"
                width={24}
                height={24}
                className="h-6 w-6 rounded-md"
              />
              <span className="text-xs text-surface-400">
                &copy; 2026 MSMEMate &middot; Made by Xphora AI Technology Pvt
                Ltd &middot; msmemate.com
              </span>
            </div>

            {/* Legal + trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-surface-400">
              <Link
                href="/privacy"
                className="font-medium transition-colors hover:text-brand-500"
              >
                Privacy Policy
              </Link>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <Link
                href="/terms"
                className="font-medium transition-colors hover:text-brand-500"
              >
                Terms &amp; Conditions
              </Link>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <span className="flex items-center gap-1.5">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                </span>
                IndiaAI 2026
              </span>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <Link
                href="/dpdp"
                className="font-medium transition-colors hover:text-brand-500"
              >
                DPDP Compliant
              </Link>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <Link
                href="/sovereign-ai"
                className="font-medium transition-colors hover:text-brand-500"
              >
                Sovereign AI
              </Link>
            </div>
          </div>
        </div>

        <div className="tricolour-bar" />
      </footer>
    </div>
  );
}
