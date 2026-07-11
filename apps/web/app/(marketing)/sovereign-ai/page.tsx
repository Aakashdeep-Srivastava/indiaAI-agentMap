import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sovereign AI",
  description:
    "Every AI decision on MSMEMate runs on Indian, sovereign infrastructure — no foreign LLM APIs, Indian data residency, explainable outputs and human oversight by NSIC officers.",
  alternates: { canonical: "/sovereign-ai" },
};

const PRINCIPLES = [
  {
    title: "Indian AI, on Indian soil",
    desc: "Speech recognition, document reading, language understanding and classification all run on Indian AI services and models we control — never on foreign LLM APIs. Your business data is not sent to overseas AI providers, full stop.",
    icon: "M12 21s-7-5.1-7-11a7 7 0 0114 0c0 5.9-7 11-7 11z",
  },
  {
    title: "Built for Bharat's languages",
    desc: "The AI listens and reads in Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati and more — including code-mixed Hinglish — because an entrepreneur in Moradabad should not need English to go digital.",
    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
  },
  {
    title: "Explainable, not a black box",
    desc: "Every classification and every match comes with a confidence band and a written reason in plain language — English or Hindi. If the AI is not sure, it says so, and the case goes to a person.",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  },
  {
    title: "Humans hold the pen",
    desc: "AI recommends; NSIC officers decide. Official approvals and seller-platform allocations are made by accountable people, and every AI decision is written to an immutable audit trail they can inspect.",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
  {
    title: "Honest engine labels",
    desc: "Results are stamped with the engine that actually produced them — a trained model, the AI language engine, or a deterministic fallback. We never dress up a fallback as AI, or AI as magic.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Aligned with IndiaAI",
    desc: "MSMEMate is built by Team XphoraAI for the IndiaAI Innovation Challenge 2026 — strategic autonomy in AI is not a slogan here, it is the architecture: sovereign models, Indian data residency, DPDP-compliant processing.",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
];

export default function SovereignAiPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        Trust &amp; Compliance
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        Sovereign AI
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-surface-600 sm:text-[15px]">
        When an entrepreneur speaks their business into MSMEMate, that voice —
        and everything the AI learns from it — stays within India&rsquo;s
        digital borders. That is what Sovereign AI means here: भारत का डेटा,
        भारत में, भारत के लिए।
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="glass-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-500/10">
              <svg
                className="h-5 w-5 text-saffron-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={p.icon} />
              </svg>
            </div>
            <h2 className="mt-3 font-display text-base font-bold text-brand-900">
              {p.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-surface-500">
              {p.desc}
            </p>
          </div>
        ))}
      </div>

      {/* The three modules */}
      <h2 className="mt-12 font-display text-xl font-bold tracking-tight text-brand-900">
        Three AI systems, one sovereign stack
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          {
            name: "Sathi",
            role: "Registration",
            desc: "Voice-first onboarding that reads your Udyam, PAN and GST documents and fills the form for you.",
          },
          {
            name: "VargBot",
            role: "Classification",
            desc: "Places your business in the right ONDC domain and category, with confidence bands and reasons.",
          },
          {
            name: "JodakAI",
            role: "Matching",
            desc: "Ranks ONDC seller platforms that fit your category, district and language — auditable by NSIC.",
          },
        ].map((m) => (
          <div key={m.name} className="glass-card p-5 text-center">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-surface-400">
              {m.role}
            </span>
            <h3 className="mt-1 font-display text-lg font-extrabold text-brand-900">
              {m.name}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-surface-500">
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Cross-links */}
      <div className="glass-card mt-10 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-surface-600">
          Sovereign AI and data protection go together — see how we implement
          the DPDP Act 2023.
        </p>
        <Link href="/dpdp" className="btn-saffron shrink-0 !px-5 !py-2.5 !text-xs">
          DPDP Compliance
        </Link>
      </div>
    </div>
  );
}
