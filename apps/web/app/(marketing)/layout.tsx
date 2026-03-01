import Image from "next/image";
import Navbar from "@/components/Navbar";
import FooterIllustration from "@/components/FooterIllustration";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-jali">
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
                    <a
                      href={item.href}
                      className="text-sm text-surface-500 transition-colors hover:text-brand-500"
                    >
                      {item.label}
                    </a>
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
                src="/logo.svg"
                alt="AgentMap AI"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="text-xs text-surface-400">
                &copy; 2026 AgentMap AI &middot; Team XphoraAI
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
