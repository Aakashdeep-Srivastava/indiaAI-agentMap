import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MSMEMate (Xphora AI Technology Pvt Ltd) collects, uses, stores and protects your personal data under India's DPDP Act 2023 — with data residency in India.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

const EFFECTIVE_DATE = "11 July 2026";

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Who we are",
    paragraphs: [
      "MSMEMate (msmemate.com) is operated by Xphora AI Technology Pvt Ltd (“Company”, “we”, “us”). For the purposes of the Digital Personal Data Protection Act, 2023 (“DPDP Act”), the Company is the Data Fiduciary for personal data processed on this platform.",
      "MSMEMate helps micro and small enterprises (MSEs) register, get classified into ONDC categories, and get matched with ONDC Seller Network Participants (SNPs), with review and official allocation by NSIC officers.",
    ],
  },
  {
    heading: "2. What data we collect",
    paragraphs: ["We collect only what the onboarding journey needs:"],
    list: [
      "Business identity — Udyam registration number, enterprise name, business description, products, sector and organisation type.",
      "Location — state, district, address and PIN code.",
      "Owner and contact details — entrepreneur name, email address, mobile number, and (where you provide them) PAN and GST numbers.",
      "Preferences — language, B2B/B2C intent, ONDC-awareness and SNP opt-ins, and optional gender of owner (used only for fairness tracking in aggregate).",
      "Voice recordings and documents — audio you speak and certificates you upload (Udyam, PAN, GST, incorporation) are processed to extract fields and are not stored (see Section 6).",
      "Technical records — authentication events, rate-limit counters and an audit trail of AI decisions (without raw personal payloads).",
    ],
  },
  {
    heading: "3. Why we process it (purpose limitation)",
    paragraphs: [
      "Your data is processed only to: (a) create and verify your MSE profile, (b) classify your business into ONDC domains and categories, (c) recommend and allocate suitable Seller Network Participants, and (d) let NSIC officers review and audit those AI decisions.",
      "We do not use your personal data for marketing, we do not sell it, and we do not share it with anyone outside this purpose.",
    ],
  },
  {
    heading: "4. Consent",
    paragraphs: [
      "Registration requires your explicit, informed consent, shown in English and Hindi, before any enterprise data is stored. Our servers reject any registration submitted without consent.",
      "Your consent and its timestamp are recorded on your profile and in the audit trail. You may withdraw consent at any time by requesting erasure (Section 9).",
    ],
  },
  {
    heading: "5. Where your data lives (data residency)",
    paragraphs: [
      "All personal data at rest is stored in India, in our primary datastore hosted in Mumbai (ap-south-1). AI processing (speech-to-text, document reading, classification) is performed by Indian, sovereign-AI providers. Our cache layer stores no personal data — only rate-limit and quota state.",
    ],
  },
  {
    heading: "6. Voice recordings and documents",
    paragraphs: [
      "Audio clips you speak and documents you upload are processed in memory to extract the fields you see on screen, and are then discarded. We do not persist the raw recording or the raw file. Only the extracted, confirmed profile fields are saved.",
    ],
  },
  {
    heading: "7. Who can see your data",
    list: [
      "You — your own profile and results, after signing in.",
      "NSIC officers — for reviewing registrations, approving classifications and making official SNP allocations; their access is role-restricted and audited.",
      "Your allocated Seller Network Participant — receives the business details needed to onboard you, as part of the allocation you consented to.",
      "Nobody else. Bulk access to personal data and the audit trail is restricted to administrators; database-level access is deny-all except for our backend service.",
    ],
  },
  {
    heading: "8. How we protect it",
    list: [
      "Encrypted in transit (TLS) and at rest.",
      "Signed JWT authentication with role-based access control on every private endpoint.",
      "Passwords stored only as bcrypt hashes — never in plain text.",
      "Login lockout after 5 failed attempts (15 minutes) and per-IP rate limiting.",
      "Row-level security on all database tables (deny-all to public roles).",
      "An immutable audit trail of AI decisions and administrative actions.",
    ],
  },
  {
    heading: "9. Your rights under the DPDP Act",
    paragraphs: [
      "You have the right to access your data, correct it, and have it erased. Erasure removes your profile and every derived AI artifact (classification results, match results); the fact of erasure is recorded in the audit trail without retaining the erased data itself.",
      "To exercise any right, contact the Grievance Officer (Section 12) with your Udyam number. We respond within the timelines prescribed by the DPDP Act and its rules.",
    ],
  },
  {
    heading: "10. Retention",
    list: [
      "Voice recordings and uploaded documents — not persisted; processed and discarded immediately.",
      "MSE profile (including mobile number) — kept until you request erasure or close your account.",
      "Derived AI results — same lifecycle as the profile; deleted on erasure.",
      "Audit logs — 180 days, containing no raw personal payloads.",
      "Authentication data — bcrypt hashes only.",
    ],
  },
  {
    heading: "11. Cookies and local storage",
    paragraphs: [
      "MSMEMate uses no advertising cookies and no third-party trackers. After sign-in, a session token is kept in your browser's local storage solely to keep you signed in; signing out removes it.",
    ],
  },
  {
    heading: "12. Grievance Officer and contact",
    paragraphs: [
      "Grievance Officer: Aakashdeep Srivastava, Xphora AI Technology Pvt Ltd.",
      "Email: aakashdeep@xphoraai.com · WhatsApp: +91 63949 58060.",
      "If you are not satisfied with our response, you may escalate to the Data Protection Board of India as provided under the DPDP Act.",
    ],
  },
  {
    heading: "13. Children",
    paragraphs: [
      "MSMEMate is a business onboarding service intended for persons aged 18 or above acting on behalf of an enterprise. We do not knowingly process children's personal data.",
    ],
  },
  {
    heading: "14. Changes to this policy",
    paragraphs: [
      "We may update this policy as the platform evolves or the law requires. The effective date above always reflects the latest version, and material changes will be highlighted on this page.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        Legal
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-surface-400">
        Effective date: {EFFECTIVE_DATE} &middot; Xphora AI Technology Pvt Ltd
      </p>
      <p className="mt-5 text-sm leading-relaxed text-surface-600 sm:text-[15px]">
        This policy explains, in plain language, what personal data MSMEMate
        collects, why, where it is stored, who can see it, and the rights you
        hold under India&rsquo;s Digital Personal Data Protection Act, 2023.
        गोपनीयता आपका अधिकार है — इसे हम गंभीरता से लेते हैं।
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-lg font-bold tracking-tight text-brand-900 sm:text-xl">
              {s.heading}
            </h2>
            {s.paragraphs?.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mt-2.5 text-sm leading-relaxed text-surface-600 sm:leading-7"
              >
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-3 space-y-2">
                {s.list.map((item) => (
                  <li key={item.slice(0, 40)} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span className="text-sm leading-relaxed text-surface-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-surface-200 pt-6 text-sm text-surface-500">
        See also{" "}
        <Link href="/terms" className="font-semibold text-brand-500 hover:underline">
          Terms &amp; Conditions
        </Link>
        .
      </div>
    </div>
  );
}
