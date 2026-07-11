import type { Metadata } from "next";
import Link from "next/link";
import { CITY_CLUSTERS } from "@/lib/cities";

export const metadata: Metadata = {
  title: "Sell on ONDC from Your City — India's MSME Clusters",
  description:
    "From Moradabad brass to Kanchipuram silk — city-by-city guides for taking India's famous MSME clusters onto ONDC with voice-first AI onboarding.",
  alternates: { canonical: "/ondc" },
  openGraph: {
    title: "Sell on ONDC from Your City — India's MSME Clusters",
    description:
      "City-by-city guides for taking India's famous MSME clusters onto ONDC.",
    url: "https://www.msmemate.com/ondc",
    type: "website",
  },
};

export default function OndcCitiesHub() {
  /* Group by state for scannability */
  const states = Array.from(
    CITY_CLUSTERS.reduce((map, c) => {
      map.set(c.state, [...(map.get(c.state) ?? []), c]);
      return map;
    }, new Map<string, typeof CITY_CLUSTERS>()),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        ONDC by City
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        Sell on ONDC from your city
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-surface-600 sm:text-base">
        India&rsquo;s MSMEs are city-anchored — brass in Moradabad, silk in
        Varanasi, knitwear in Tirupur. Find your cluster below and see exactly
        how businesses like yours go online with ONDC, in your language.
        अपने शहर से शुरू कीजिए।
      </p>

      <div className="mt-10 space-y-10">
        {states.map(([state, cities]) => (
          <section key={state}>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-surface-400">
              {state}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/ondc/${c.slug}`}
                  className="glass-card group p-4"
                >
                  <h3 className="font-display text-base font-bold text-brand-900 transition-colors group-hover:text-brand-500">
                    {c.city}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-saffron-500">
                    {c.industry}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-surface-500">
                    {c.products.slice(0, 4).join(" · ")}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="glass-card mt-12 flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-900">
            Don&rsquo;t see your city?
          </h2>
          <p className="mt-1 text-sm text-surface-500">
            MSMEMate works for every district in India — registration is free
            and takes minutes.
          </p>
        </div>
        <Link href="/register" className="btn-saffron shrink-0">
          Register your business
        </Link>
      </div>
    </div>
  );
}
