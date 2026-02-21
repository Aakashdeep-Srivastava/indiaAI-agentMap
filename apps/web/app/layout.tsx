import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMap AI — Sovereign ONDC Mapping",
  description:
    "AI-native mapping layer for MSE-to-SNP onboarding on ONDC, built with Sovereign AI principles under the DPDP Act 2023.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {/* ── Government-themed header bar ─────────────────────────── */}
        <header className="bg-navy-800 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-800 text-sm font-bold">
                AI
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">
                  AgentMap AI
                </h1>
                <p className="text-xs text-slate-300">
                  Sovereign ONDC Mapping Layer
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/" className="hover:text-saffron-500 transition-colors">
                Dashboard
              </a>
              <a
                href="/register"
                className="hover:text-saffron-500 transition-colors"
              >
                Register MSE
              </a>
            </nav>
          </div>

          {/* Tricolour accent strip */}
          <div className="flex h-1">
            <div className="flex-1 bg-orange-500" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-green-600" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          AgentMap AI v0.1 — IndiaAI Innovation Challenge 2026 — Sovereign AI
          Compliant (DPDP Act 2023)
        </footer>
      </body>
    </html>
  );
}
