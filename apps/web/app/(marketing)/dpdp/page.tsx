import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DPDP Act 2023 Compliance",
  description:
    "How MSMEMate complies with India's Digital Personal Data Protection Act 2023 — data residency in Mumbai, explicit consent, purpose limitation, erasure rights and auditable AI.",
  alternates: { canonical: "/dpdp" },
};

const PILLARS = [
  {
    title: "Data residency: India, always",
    desc: "Every piece of personal data at rest lives in our primary datastore in Mumbai (ap-south-1). AI processing runs on Indian, sovereign providers. Our cache layer holds no personal data at all — only rate-limit state.",
    icon: "M12 21s-7-5.1-7-11a7 7 0 0114 0c0 5.9-7 11-7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  },
  {
    title: "Consent before anything",
    desc: "Registration requires explicit, informed consent shown in English and Hindi. Our servers reject any registration without it, and the consent plus its timestamp is recorded on the profile and in the audit trail.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Purpose limitation",
    desc: "Your data is processed only to register your enterprise, classify it into ONDC categories, and recommend seller platforms — nothing else. No marketing use. No resale. Ever.",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
  {
    title: "Right to erasure, honoured fully",
    desc: "An erasure request removes your profile and every derived AI artifact — classification results and match results included. The erasure itself is logged in the audit trail without keeping the erased data.",
    icon: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z",
  },
  {
    title: "Voice & documents never stored",
    desc: "Audio you speak and certificates you upload are processed in memory to extract fields, then discarded. Only the confirmed profile fields are saved — never the raw recording or file.",
    icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4",
  },
  {
    title: "Locked-down access",
    desc: "Signed JWT authentication with role-based access on every private endpoint; bulk personal-data access is administrator-only; database tables enforce deny-all row-level security; passwords exist only as bcrypt hashes; failed logins lock out.",
    icon: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  },
];

const RETENTION = [
  ["Voice recordings & uploaded documents", "Not persisted — processed in memory, then discarded"],
  ["MSE profile (incl. mobile number)", "Until erasure request or account closure"],
  ["Derived AI results", "Same lifecycle as the profile; deleted on erasure"],
  ["Audit logs", "180 days; no raw personal payloads"],
  ["Authentication data", "bcrypt password hashes only — never plain text"],
];

export default function DpdpPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        Trust &amp; Compliance
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        DPDP Act 2023 Compliance
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-surface-600 sm:text-[15px]">
        MSMEMate handles the personal data of India&rsquo;s entrepreneurs under
        the Digital Personal Data Protection Act, 2023 — not as a checkbox,
        but as the way the platform is built. आपका डेटा, आपका अधिकार — भारत में
        ही सुरक्षित।
      </p>

      {/* Pillars */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.title} className="glass-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
              <svg
                className="h-5 w-5 text-brand-500"
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

      {/* Retention table */}
      <h2 className="mt-12 font-display text-xl font-bold tracking-tight text-brand-900">
        What we keep, and for how long
      </h2>
      <div className="glass-card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50/60">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                Data
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                Retention
              </th>
            </tr>
          </thead>
          <tbody>
            {RETENTION.map(([data, retention]) => (
              <tr key={data} className="border-b border-surface-100 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-900">{data}</td>
                <td className="px-4 py-3 text-surface-500">{retention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cross-links */}
      <div className="glass-card mt-10 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-surface-600">
          The full detail — your rights, grievance officer, and how to exercise
          erasure — lives in our Privacy Policy.
        </p>
        <Link href="/privacy" className="btn-primary shrink-0 !px-5 !py-2.5 !text-xs">
          Read the Privacy Policy
        </Link>
      </div>
    </div>
  );
}
