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
    url: "https://www.msmemate.com",
    logo: "https://www.msmemate.com/logo.png",
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
                  "Team XphoraAI",
                  "IndiaAI Challenge 2026",
                  "DPDP Compliance",
                  "Sovereign AI",
                ].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-surface-500">{item}</span>
                  </li>
                ))}
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
                src="/logo.png"
                alt="MSMEMate"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="text-xs text-surface-400">
                &copy; 2026 MSMEMate &middot; Team XphoraAI &middot; msmemate.com
              </span>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 text-[11px] text-surface-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                </span>
                IndiaAI 2026
              </span>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <span>DPDP Compliant</span>
              <span className="h-1 w-1 rounded-full bg-surface-300" />
              <span>Sovereign AI</span>
            </div>
          </div>
        </div>

        <div className="tricolour-bar" />
      </footer>
    </div>
  );
}
