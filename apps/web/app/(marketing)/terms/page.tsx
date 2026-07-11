import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms of use for MSMEMate by Xphora AI Technology Pvt Ltd — eligibility, acceptable use, how AI recommendations work, third-party seller apps, and liability.",
  alternates: { canonical: "/terms" },
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
    heading: "1. Acceptance of these terms",
    paragraphs: [
      "By accessing msmemate.com or using MSMEMate (the “Service”), you agree to these Terms & Conditions and to our Privacy Policy. If you do not agree, please do not use the Service.",
      "The Service is operated by Xphora AI Technology Pvt Ltd (“Company”, “we”, “us”).",
    ],
  },
  {
    heading: "2. What the Service is",
    paragraphs: [
      "MSMEMate is an AI-assisted onboarding platform that helps micro and small enterprises (MSEs) register, classify their business into ONDC domains and categories, and get matched with ONDC Seller Network Participants (SNPs), with review and official allocation performed by NSIC officers.",
      "The Service is currently provided free of charge to MSEs. It was built by Team XphoraAI for the IndiaAI Innovation Challenge 2026 and operates on a facilitation model — we are not a marketplace and we do not sell your products.",
    ],
  },
  {
    heading: "3. Eligibility and your responsibilities",
    list: [
      "You must be at least 18 years old and authorised to act for the enterprise you register.",
      "Information you provide — including your Udyam number, PAN, GST and business description — must be true, current and yours to share.",
      "You are responsible for keeping your sign-in credentials confidential and for all activity under your account.",
      "You must not upload forged or tampered documents; doing so may lead to rejection, account termination and reporting where the law requires.",
    ],
  },
  {
    heading: "4. AI recommendations and human review",
    paragraphs: [
      "MSMEMate uses AI to read documents, classify businesses and rank seller platforms. Every AI output is a recommendation, shown with a confidence band and a plain-language explanation — it is not an official decision.",
      "Official approvals and SNP allocations are made by NSIC officers, and low-confidence AI results are routed to human review. We do not guarantee that any classification, match, allocation, onboarding outcome or sales volume will result from using the Service, and you should verify extracted details before confirming them.",
    ],
  },
  {
    heading: "5. Acceptable use",
    list: [
      "Do not attempt to access other users' data, bypass authentication, or probe, scan or overload the Service (rate limits apply and are enforced).",
      "Do not use the Service to register businesses dealing in goods or services that are unlawful in India.",
      "Do not scrape, resell or commercially redistribute the Service or its outputs without our written permission.",
      "Do not misuse the voice and document channels (e.g., submitting content you have no right to submit).",
    ],
  },
  {
    heading: "6. Your data and our licence",
    paragraphs: [
      "Your business data remains yours. You grant the Company a limited licence to process it solely for the purposes described in the Privacy Policy — registration, classification, matching and review. Handling of personal data is governed by our Privacy Policy and the DPDP Act, 2023.",
    ],
  },
  {
    heading: "7. Intellectual property",
    paragraphs: [
      "The Service — including the MSMEMate name, logo, interface, and its AI systems (Sathi, VargBot, JodakAI) — is the intellectual property of the Company and its licensors. These terms grant you a personal, non-exclusive, non-transferable right to use the Service; they transfer no ownership.",
    ],
  },
  {
    heading: "8. Third-party services and ONDC",
    paragraphs: [
      "Seller Network Participants are independent businesses. Their commissions, settlement cycles, onboarding requirements and service terms are their own — always confirm them directly with the SNP before completing KYC. ONDC network policies are set by ONDC, not by us.",
      "We are not a party to, and accept no liability for, any agreement between you and an SNP, buyer app, logistics provider or any other network participant.",
    ],
  },
  {
    heading: "9. Availability and changes",
    paragraphs: [
      "The Service is under active development and is provided on an evolving, best-effort basis. We may add, change, suspend or discontinue features, and may impose or adjust usage limits, at any time. We will aim to give reasonable notice of material changes on this page.",
    ],
  },
  {
    heading: "10. Disclaimers and limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, the Service is provided “as is” and “as available”, without warranties of any kind, express or implied — including fitness for a particular purpose and non-infringement.",
      "To the maximum extent permitted by applicable law, the Company shall not be liable for indirect, incidental, special or consequential losses, loss of profits, loss of business, or loss of data arising from use of the Service. Nothing in these terms limits liability that cannot be limited under Indian law.",
    ],
  },
  {
    heading: "11. Indemnity",
    paragraphs: [
      "You agree to indemnify the Company against claims arising from your breach of these terms, your violation of law, or information you submitted being false or infringing others' rights.",
    ],
  },
  {
    heading: "12. Termination",
    paragraphs: [
      "You may stop using the Service at any time and may request erasure of your data as described in the Privacy Policy. We may suspend or terminate access for breach of these terms, unlawful activity, or risk to the Service or other users.",
    ],
  },
  {
    heading: "13. Governing law and jurisdiction",
    paragraphs: [
      "These terms are governed by the laws of India. Subject to any mandatory provisions of law, the competent courts in India shall have jurisdiction over disputes arising from these terms or the Service.",
    ],
  },
  {
    heading: "14. Grievances and contact",
    paragraphs: [
      "Questions, complaints or notices under these terms: Aakashdeep Srivastava, Xphora AI Technology Pvt Ltd — aakashdeep@xphoraai.com · WhatsApp +91 63949 58060.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        Legal
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-xs text-surface-400">
        Effective date: {EFFECTIVE_DATE} &middot; Xphora AI Technology Pvt Ltd
      </p>
      <p className="mt-5 text-sm leading-relaxed text-surface-600 sm:text-[15px]">
        These terms keep the platform fair and honest for everyone — plain
        language first, legal precision where it matters.
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
        <Link href="/privacy" className="font-semibold text-brand-500 hover:underline">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
