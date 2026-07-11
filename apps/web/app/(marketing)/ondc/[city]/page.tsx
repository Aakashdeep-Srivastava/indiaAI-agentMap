import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITY_CLUSTERS, getCity } from "@/lib/cities";

export function generateStaticParams() {
  return CITY_CLUSTERS.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const c = getCity(city);
  if (!c) return {};
  const title = `Sell on ONDC from ${c.city} — ${c.industry}`;
  const description = `How ${c.city}'s ${c.industry.toLowerCase()} businesses join ONDC: free voice-first registration in your language, AI classification and seller-app matching for ${c.state}.`;
  return {
    title,
    description,
    keywords: [
      `ONDC registration ${c.city}`,
      `sell online ${c.city}`,
      `${c.city} MSME`,
      c.industry,
      ...c.products.slice(0, 4),
    ],
    alternates: { canonical: `/ondc/${c.slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.msmemate.com/ondc/${c.slug}`,
      type: "website",
    },
  };
}

const STEPS = [
  {
    title: "Register by voice — free",
    detail:
      "Speak your business details in your language; Sathi fills the form and reads your Udyam certificate from a photo.",
  },
  {
    title: "Get your ONDC category",
    detail:
      "VargBot classifies your products into the right ONDC domain with a confidence band and a plain-language reason.",
  },
  {
    title: "Match with a seller app",
    detail:
      "JodakAI ranks ONDC seller apps by category fit, coverage of your district, language support and onboarding help.",
  },
];

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const c = getCity(city);
  if (!c) notFound();

  const genericFaq = [
    {
      q: `What does it cost to register a ${c.city} business on MSMEMate?`,
      a: "Nothing. Registration, classification and seller-app matching are free for MSEs. Individual seller apps set their own commissions — always confirm those directly before completing KYC.",
    },
    {
      q: `Which documents does a ${c.city} MSE need?`,
      a: "A free Udyam registration (Aadhaar is enough to get one at udyamregistration.gov.in), PAN, GST where your category requires it, and bank details for settlements. MSMEMate reads your certificates from a photo or PDF.",
    },
    {
      q: "Can I register in my own language?",
      a: "Yes — the voice flow works in Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati and more, including code-mixed speech. Explanations are shown in simple English and Hindi.",
    },
  ];
  const faqs = [c.faq, ...genericFaq];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `ONDC onboarding for MSMEs in ${c.city}`,
      serviceType: "MSME digital commerce onboarding",
      provider: {
        "@type": "Organization",
        name: "MSMEMate",
        url: "https://www.msmemate.com",
      },
      areaServed: {
        "@type": "City",
        name: c.city,
        containedInPlace: { "@type": "State", name: c.state },
      },
      availableLanguage: ["en", "hi"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      description: `Voice-first ONDC registration, classification and seller-app matching for ${c.industry.toLowerCase()} businesses in ${c.city}, ${c.state}.`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ONDC by City",
          item: "https://www.msmemate.com/ondc",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: c.city,
          item: `https://www.msmemate.com/ondc/${c.slug}`,
        },
      ],
    },
  ];

  const others = CITY_CLUSTERS.filter((o) => o.slug !== c.slug).slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-surface-400">
        <Link href="/ondc" className="font-medium hover:text-brand-500">
          ONDC by City
        </Link>{" "}
        <span aria-hidden>/</span>{" "}
        <span className="text-surface-500">{c.city}</span>
      </nav>

      {/* Header */}
      <header className="mt-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
          {c.state}
          {c.knownAs ? ` · ${c.knownAs}` : ""}
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl">
          Sell on ONDC from {c.city}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-surface-600 sm:text-[15px] sm:leading-7">
          {c.intro}
        </p>
      </header>

      {/* Products */}
      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          What {c.city} makes
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.products.map((p) => (
            <span
              key={p}
              className="rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-xs font-medium text-surface-600"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-surface-400">
          Maps to ONDC domains: {c.ondcFit.join(" · ")}
        </p>
      </section>

      {/* Steps */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
          How a {c.city} business goes online
        </h2>
        <ol className="mt-5 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-display text-xs font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-brand-900 sm:text-[15px]">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-surface-600">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/register" className="btn-saffron mt-6 inline-flex">
          Start free registration
        </Link>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
          {c.city} sellers ask
        </h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="glass-card group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-900">
                {f.q}
                <svg
                  className="h-4 w-4 shrink-0 text-surface-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-surface-600">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Guides cross-link */}
      <section className="mt-10 rounded-2xl border border-surface-200 bg-surface-50/60 p-5">
        <p className="text-sm text-surface-600">
          New to ONDC? Read{" "}
          <Link
            href="/blog/what-is-ondc-guide-for-msmes"
            className="font-semibold text-brand-500 hover:underline"
          >
            What is ONDC?
          </Link>{" "}
          and the{" "}
          <Link
            href="/blog/udyam-to-ondc-step-by-step"
            className="font-semibold text-brand-500 hover:underline"
          >
            Udyam-to-ONDC step-by-step guide
          </Link>
          .
        </p>
      </section>

      {/* Other cities */}
      <div className="mt-10 border-t border-surface-200 pt-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-400">
          Other cluster cities
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/ondc/${o.slug}`}
              className="rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:border-brand-500/40 hover:text-brand-900"
            >
              {o.city} — {o.industry}
            </Link>
          ))}
          <Link
            href="/ondc"
            className="rounded-full border border-brand-500/30 bg-brand-50/50 px-3.5 py-1.5 text-xs font-semibold text-brand-500"
          >
            All cities →
          </Link>
        </div>
      </div>
    </div>
  );
}
