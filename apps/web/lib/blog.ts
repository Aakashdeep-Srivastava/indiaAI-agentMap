/**
 * MSMEMate blog — static, SEO/AEO-first content library.
 *
 * Every post is answer-first: `tldr` gives the direct answer in the first
 * 150 words (featured-snippet / answer-engine friendly), `faq` feeds the
 * FAQPage JSON-LD, and sections keep one topic each.
 */

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
  /** Ordered steps render as a numbered list (HowTo-style content) */
  steps?: { title: string; detail: string }[];
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  datePublished: string;
  dateModified: string;
  readMinutes: number;
  keywords: string[];
  hindiTagline: string;
  tldr: string;
  sections: BlogSection[];
  faq: BlogFaq[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-ondc-guide-for-msmes",
    title: "What is ONDC? A Simple Guide for Indian MSMEs",
    metaTitle: "What is ONDC? A Simple Guide for Indian MSMEs",
    description:
      "ONDC explained in plain language for small business owners: what the Open Network for Digital Commerce is, how it differs from marketplaces, and how your MSME can join.",
    datePublished: "2026-07-11",
    dateModified: "2026-07-11",
    readMinutes: 6,
    keywords: [
      "what is ONDC",
      "ONDC for small business",
      "ONDC MSME",
      "Open Network for Digital Commerce",
      "sell on ONDC",
    ],
    hindiTagline: "ONDC क्या है? आसान भाषा में समझिए।",
    tldr:
      "ONDC (Open Network for Digital Commerce) is a government-backed open network, incubated by DPIIT in 2021, that lets any seller reach buyers on any participating app — instead of being locked into one marketplace. Your shop is listed once through a seller app, and customers on every buyer app in the network can find and order from you. For India's 6-crore-plus MSMEs, it means online reach without marketplace lock-in.",
    sections: [
      {
        heading: "ONDC in one sentence",
        paragraphs: [
          "The Open Network for Digital Commerce (ONDC) is an open, interoperable network for buying and selling online, incubated by the Department for Promotion of Industry and Internal Trade (DPIIT), Government of India, in 2021.",
          "Think of it the way UPI changed payments: before UPI, your money lived inside one wallet app. After UPI, any bank app could pay any other. ONDC does the same for commerce — a customer on one buyer app can order from a seller listed on a completely different seller app, because both speak the same open protocol.",
        ],
      },
      {
        heading: "How is ONDC different from a marketplace?",
        paragraphs: [
          "On a marketplace, the platform owns the customer, sets the commission, and controls your visibility. If you leave, you start from zero. On ONDC, your catalogue lives with a seller app of your choice (called a Seller Network Participant, or SNP), and every buyer app on the network can surface your products.",
        ],
        list: [
          "One listing, many storefronts — your products appear across all buyer apps on the network.",
          "Choice of seller app — you pick the SNP whose commission, language support and onboarding help suit you.",
          "Portability — your business identity is not trapped inside a single platform.",
          "Level playing field — a kirana in Moradabad and a national brand use the same open protocol.",
        ],
      },
      {
        heading: "Why it matters for MSMEs specifically",
        paragraphs: [
          "India has over 6 crore registered MSMEs, and the sector contributes roughly 30% of GDP according to the Ministry of MSME — yet only a small fraction sell online today. The two biggest blockers are onboarding friction (forms, documents, English-only flows) and the fear of marketplace dependence.",
          "ONDC removes the second blocker by design. Tools like MSMEMate remove the first: voice-first registration in your own language, automatic reading of your Udyam certificate, and AI that places your products in the right ONDC category so buyers can actually find them.",
        ],
      },
      {
        heading: "What you need before joining",
        paragraphs: [
          "You do not need a website, a developer, or English paperwork. In most cases you need:",
        ],
        list: [
          "A Udyam registration number (free at udyamregistration.gov.in — Aadhaar is enough to start).",
          "A short description of what you make or sell — even spoken in Hindi, Tamil, Bengali or another Indian language.",
          "Basic KYC documents when your chosen seller app asks (PAN, GST where applicable).",
          "A product list — the Excel or CSV file you already keep works.",
        ],
      },
    ],
    faq: [
      {
        q: "Is ONDC a government app I can download?",
        a: "No. ONDC is a network, not an app. You join it through a seller app (Seller Network Participant), and customers reach you through any buyer app connected to the network. The network protocol is open and was incubated by DPIIT, Government of India.",
      },
      {
        q: "Does joining ONDC cost money?",
        a: "The network itself does not charge sellers a membership fee. Individual seller apps set their own commissions and service charges, which is why choosing the right seller app for your category and region matters.",
      },
      {
        q: "Do I need GST to sell on ONDC?",
        a: "It depends on your category and turnover. Many small sellers below the GST threshold can onboard with just Udyam and PAN details, while some categories require GST registration. Your seller app will confirm during KYC.",
      },
      {
        q: "Can I sell in my own language?",
        a: "Yes. Buyer apps serve customers in multiple Indian languages, and onboarding tools like MSMEMate let you register and describe your business by voice in Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati and more.",
      },
    ],
  },
  {
    slug: "udyam-to-ondc-step-by-step",
    title: "From Udyam to ONDC: Take Your MSME Online, Step by Step",
    metaTitle: "Udyam to ONDC: Step-by-Step Guide for MSMEs",
    description:
      "A practical 5-step path from Udyam registration to your first ONDC listing — documents needed, how classification works, and how to pick a seller app.",
    datePublished: "2026-07-11",
    dateModified: "2026-07-11",
    readMinutes: 7,
    keywords: [
      "Udyam registration ONDC",
      "MSME sell online",
      "ONDC onboarding steps",
      "ONDC seller registration",
      "Udyam certificate online selling",
    ],
    hindiTagline: "उद्यम से ONDC तक — पाँच आसान कदम।",
    tldr:
      "Going from a Udyam certificate to selling on ONDC takes five steps: (1) register on Udyam if you haven't (free, Aadhaar-based), (2) create your business profile — on MSMEMate this is voice-first and your Udyam certificate is read automatically, (3) get your products classified into the right ONDC category, (4) choose a seller app matched to your category, district and language, and (5) complete that seller app's KYC and publish your catalogue.",
    sections: [
      {
        heading: "Step-by-step: Udyam to your first ONDC order",
        paragraphs: [
          "Here is the full path, with what each step actually requires:",
        ],
        steps: [
          {
            title: "Get your Udyam registration (free)",
            detail:
              "Register at udyamregistration.gov.in with your Aadhaar. It is paperless and free — beware of agents charging fees. You receive a Udyam number like UDYAM-UP-44-0012345.",
          },
          {
            title: "Create your business profile",
            detail:
              "On MSMEMate, Sathi (our registration assistant) collects your details by voice in your language, and reads your Udyam certificate, PAN or GST document from a photo or PDF — around 16 fields extracted in seconds, no typing.",
          },
          {
            title: "Classify your products into ONDC categories",
            detail:
              "ONDC organises commerce into domains (Grocery, Fashion, Home & Kitchen and more) with hundreds of leaf categories. VargBot reads your business description — typed, spoken, or an imported product file — and places you in the right category, with a confidence band and a plain-language reason.",
          },
          {
            title: "Choose your seller app (SNP)",
            detail:
              "Seller apps differ in commission, onboarding support, language coverage and category focus. JodakAI ranks the seller apps registered on the ONDC network that fit your category, district and language — with readable reasons, not a black box.",
          },
          {
            title: "Complete KYC and publish your catalogue",
            detail:
              "Your chosen seller app verifies KYC (PAN, GST where applicable, bank details) and publishes your products to the network. From then on, buyers on any connected buyer app can order from you.",
          },
        ],
      },
      {
        heading: "Documents checklist",
        paragraphs: ["Keep these ready — most MSMEs already have all of them:"],
        list: [
          "Udyam registration certificate (mandatory for MSMEMate onboarding)",
          "Aadhaar of the owner (used for Udyam itself)",
          "PAN — personal or business",
          "GST certificate, if your category or turnover requires it",
          "Bank account details for settlements",
          "Product list — an Excel/CSV you already maintain is enough",
        ],
      },
      {
        heading: "How long does it take?",
        paragraphs: [
          "Udyam registration is typically issued the same day. A MSMEMate profile takes minutes — the voice flow collects 12 fields with spoken validation, and document extraction runs in about 15 seconds per certificate. Seller-app KYC is the longest step and varies by SNP, commonly a few working days.",
          "The slowest path is doing all of this manually in English forms. The fastest is letting the AI read what you already have.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Udyam registration mandatory to sell on ONDC?",
        a: "ONDC itself does not mandate Udyam, but seller apps need verified business identity, and Udyam is the simplest proof for micro and small enterprises. MSMEMate uses your Udyam number as the anchor of your profile.",
      },
      {
        q: "I only have a product list in Excel. Is that enough to start?",
        a: "Yes. MSMEMate's Import Products flow accepts the Excel or CSV you already keep — every row is validated and mapped to an ONDC category, and your profile is enriched for seller-app matching.",
      },
      {
        q: "What if the AI classifies my business wrongly?",
        a: "Every classification shows a confidence band and a human-readable explanation, and you see the top-3 alternatives. Low-confidence cases go to a human review queue — an NSIC officer approves before anything becomes official.",
      },
      {
        q: "Which seller app should I pick?",
        a: "It depends on your category, district, language and how much onboarding help you need. That is exactly what JodakAI scores — it ranks seller apps with reasons like category fit, geographic coverage and support level, so you choose informed.",
      },
    ],
  },
  {
    slug: "choose-ondc-seller-app",
    title: "How to Choose the Right ONDC Seller App for Your Business",
    metaTitle: "How to Choose the Right ONDC Seller App (SNP)",
    description:
      "Commission, language support, category fit, onboarding help — the 6 factors that decide which ONDC seller app is right for your MSME, and how AI matching helps.",
    datePublished: "2026-07-11",
    dateModified: "2026-07-11",
    readMinutes: 6,
    keywords: [
      "ONDC seller app",
      "best seller app ONDC",
      "Seller Network Participant",
      "SNP comparison",
      "ONDC commission",
    ],
    hindiTagline: "आपके धंधे के लिए सही ONDC सेलर ऐप कौन-सा है?",
    tldr:
      "The right ONDC seller app (Seller Network Participant) is the one that matches six things: your product category, your district's coverage, your language, its commission structure, its onboarding support, and its track record. There are hundreds of network participants registered on ONDC — MSMEMate's JodakAI compares them on these factors for your specific business and explains every recommendation in plain language.",
    sections: [
      {
        heading: "What a seller app actually does for you",
        paragraphs: [
          "A Seller Network Participant (SNP) is your gateway to ONDC: it hosts your catalogue, handles orders coming from buyer apps, manages settlements, and supports you when something goes wrong. You sign a commercial relationship with the SNP — not with ONDC itself — which is why this choice matters more than any other in your ONDC journey.",
        ],
      },
      {
        heading: "The 6 factors that should drive your choice",
        paragraphs: [
          "When JodakAI ranks seller apps for a business, it weighs the same questions you would ask yourself:",
        ],
        list: [
          "Category fit — does the SNP actively serve your ONDC domain (say, Home & Kitchen), or is your category an afterthought?",
          "Geographic coverage — does it serve sellers and logistics in your state and district, or only metros?",
          "Language support — can you operate the seller panel and get support in your language?",
          "Commission and charges — percentage commission, fixed fees, settlement cycles.",
          "Onboarding support — assisted KYC and catalogue help versus do-it-yourself.",
          "Track record — ratings and order history where disclosed; new SNPs can be good, but you should know they are new.",
        ],
      },
      {
        heading: "Red flags to avoid",
        paragraphs: ["A few warning signs are worth checking before you sign:"],
        list: [
          "Fees charged just to 'register you on ONDC' — network onboarding itself is not a paid government service.",
          "No clarity on settlement timelines or return handling.",
          "No support channel in a language you are comfortable with.",
          "Promises of guaranteed sales — no honest participant can promise order volumes.",
        ],
      },
      {
        heading: "How MSMEMate's matching keeps it honest",
        paragraphs: [
          "JodakAI scores seller apps registered on the ONDC network against your profile and shows each factor as a simple band — High, Medium, Low — with a written reason in English or Hindi. Officers at NSIC can audit every recommendation, and the official allocation is always made by a human, not silently by the algorithm.",
          "That design is deliberate: AI does the reading and ranking that would take you weeks, and people you can hold accountable make the final call.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I be on more than one ONDC seller app?",
        a: "Technically yes — the network does not forbid it — but managing one catalogue, inventory and settlement relationship well usually beats juggling several. Start with the best-fit SNP and expand only if you have a reason.",
      },
      {
        q: "What commission do ONDC seller apps charge?",
        a: "It varies by SNP and category — there is no single network-wide rate. Always confirm the percentage, any fixed fees, and the settlement cycle in writing before you complete KYC.",
      },
      {
        q: "Can I switch seller apps later?",
        a: "Yes. Because ONDC is an open network, your business is not locked in — you can onboard with a different SNP and republish your catalogue. Keeping your own product master file (Excel/CSV) makes switching painless.",
      },
      {
        q: "How does MSMEMate earn if matching is free for MSEs?",
        a: "MSMEMate is built by Team XphoraAI for the IndiaAI Innovation Challenge 2026 with NSIC's facilitation model — the platform's goal is successful, auditable MSE-to-SNP onboarding, not seller commissions.",
      },
    ],
  },
];

BLOG_POSTS.push({
  slug: "msme-team-initiative-explained",
  title: "The MSME TEAM Initiative, Explained: ₹277 Crore to Put 5 Lakh MSEs on ONDC",
  metaTitle: "MSME TEAM Initiative Explained — ONDC for 5 Lakh MSEs",
  description:
    "What the MSME TEAM scheme is, who qualifies, what seller apps are paid to onboard you, and how to register free — the government push behind ONDC for small businesses.",
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  readMinutes: 8,
  keywords: [
    "MSME TEAM initiative",
    "TEAM scheme ONDC",
    "team.msmemart.com",
    "MSE onboarding scheme",
    "RAMP scheme MSME",
    "SNP incentives",
  ],
  hindiTagline: "MSME TEAM योजना — आसान भाषा में पूरी जानकारी।",
  tldr:
    "The MSME TEAM (Trade Enablement and Marketing) Initiative is a ₹277.35 crore Government of India scheme (2024–27, under the World Bank-supported RAMP programme) to bring 5 lakh Micro and Small Enterprises onto ONDC — half of them women-owned. It was launched on 27 June 2024, is implemented by NSIC with ONDC as technical partner, and registration is free for MSEs at team.msmemart.com. Seller apps (SNPs), not MSEs, receive the milestone incentives for onboarding you — so a genuine SNP should never charge you a registration fee.",
  sections: [
    {
      heading: "What the TEAM Initiative is",
      paragraphs: [
        "TEAM stands for Trade Enablement and Marketing. It is a sub-scheme of RAMP (Raising and Accelerating MSME Performance), the Ministry of MSME's World Bank-supported programme, with an outlay of ₹277.35 crore across FY 2024-25 to FY 2026-27. It was launched on 27 June 2024 — International MSME Day — by the Union Minister for MSME.",
        "The goal is direct: digitally empower 5 lakh Micro and Small Enterprises by getting them selling on ONDC, with 2.5 lakh of those being women-owned enterprises, and a special focus on Tier-2/3 cities and SC/ST clusters. The National Small Industries Corporation (NSIC) implements the scheme, and ONDC is the technical partner.",
      ],
    },
    {
      heading: "Who is eligible",
      paragraphs: ["The scheme's eligibility gates are specific — check these before anything else:"],
      list: [
        "Micro or Small enterprises only — Medium enterprises are not covered.",
        "Major activity must be Manufacturing or Services — pure Trading businesses do not qualify.",
        "A valid Udyam registration is required (free at udyamregistration.gov.in).",
        "The business must not already be selling on ONDC, and must not have taken a similar Central or State ONDC benefit.",
        "One seller app (SNP) per MSE — you may switch your SNP only once.",
      ],
    },
    {
      heading: "Who gets paid — and why that protects you",
      paragraphs: [
        "The scheme's incentives go to the Seller Network Participants — the ONDC seller apps that onboard you — not to the MSE. Per the scheme guidelines, an SNP can earn per onboarded MSE: ₹450 for digital marketing tied to your onboarding, catalogue-creation support of ₹50 per SKU (up to 50 SKUs for B2C) or ₹125 per SKU (up to 20 SKUs for B2B) capped at ₹2,500, account-management support up to ₹5,000 linked to your actual transactions, plus logistics subsidies of ₹50 per B2C order (₹200 B2B) for your first 10 orders, and packaging support through the Indian Institute of Packaging.",
        "Read that structure carefully and one thing becomes clear: the government is paying seller apps to onboard you properly. So if anyone charges you money 'to register you on ONDC under a government scheme', that is a red flag — MSE registration on the TEAM portal (team.msmemart.com) is free.",
      ],
    },
    {
      heading: "How claims are verified — and where AI comes in",
      paragraphs: [
        "Before an SNP is paid, NSIC verifies each claim: that your Udyam registration is valid, that your enterprise is Micro/Small in Manufacturing or Services, that your catalogue is actually live on the ONDC network with the claimed number of SKUs, and that no other seller app has already claimed you. Today much of this checking is manual — the IndiaAI Innovation Challenge 2026 explicitly names 'labour-intensive claim verification by NSIC' as a problem to solve.",
        "That is the layer MSMEMate is built for on the officer side: automated claim checks against scheme rules, risk-scoring so officers review by exception, and dashboards tracking progress toward the 5-lakh target with women-owned and state-wise drill-downs — with every AI decision explainable and every final call made by a human officer.",
      ],
    },
    {
      heading: "How to get started as an MSE",
      paragraphs: ["Four steps take you from nothing to selling on the network:"],
      steps: [
        {
          title: "Get your free Udyam registration",
          detail: "At udyamregistration.gov.in with your Aadhaar — it is paperless and free. This is the scheme's anchor document.",
        },
        {
          title: "Register for onboarding",
          detail: "The official portal is team.msmemart.com. On MSMEMate, registration mirrors the official TEAM form — but voice-first, in your language, with your Udyam certificate read automatically.",
        },
        {
          title: "Get classified and matched",
          detail: "Your products are placed into ONDC's category taxonomy, and you are matched with seller apps that fit your category, district and language — the same mapping the scheme intends, done with explainable AI.",
        },
        {
          title: "Go live and start selling",
          detail: "Your chosen SNP builds your ONDC catalogue (the scheme pays them for it), your products go live on the network, and buyers on every connected app can order from you.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Does the TEAM scheme give money directly to MSEs?",
      a: "No. The milestone incentives — onboarding, catalogue, account management, logistics — are paid to the Seller Network Participants who onboard you. Your benefit is free, supported onboarding onto ONDC, plus subsidised logistics and packaging support in your early orders.",
    },
    {
      q: "Is registration under the TEAM Initiative free for my business?",
      a: "Yes. MSE registration on the official portal (team.msmemart.com) is free, and MSMEMate's onboarding is free too. Treat anyone demanding a fee to 'register you under the government scheme' as a warning sign.",
    },
    {
      q: "My business is a trading firm. Can I join?",
      a: "Not under TEAM — the scheme covers Micro and Small enterprises whose major activity is Manufacturing or Services. Trading businesses can still sell on ONDC directly through a seller app, just without the TEAM incentive support.",
    },
    {
      q: "Can I work with two seller apps at once under the scheme?",
      a: "No. Only one SNP can claim incentives for your enterprise, and you may switch your SNP only once. Choosing the right seller app first matters — which is exactly what MSMEMate's matching is designed to get right.",
    },
    {
      q: "What happens if a seller app files a false claim about my business?",
      a: "Claims are verified by NSIC against Udyam validity, your catalogue's live status on ONDC and the scheme's caps; false information invites legal action under the scheme's terms. AI-assisted verification — the officer side of MSMEMate — makes such checks faster and harder to game.",
    },
  ],
});

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
