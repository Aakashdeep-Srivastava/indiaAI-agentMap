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
  /** Inline SVG diagram — id must exist in components/BlogDiagram.tsx */
  diagram?: { id: string; caption: string };
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
      diagram: { id: "ondc-vs-marketplace", caption: "A marketplace locks your shop to one platform; on ONDC one listing reaches every buyer app on the network." },
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

BLOG_POSTS.push({
  slug: "how-vargbot-classifies-your-business",
  title: "Inside VargBot: How MSMEMate's AI Puts Your Business in the Right ONDC Category",
  metaTitle: "Inside VargBot — MSMEMate's ONDC Classification AI",
  description:
    "How MSMEMate classifies businesses into ONDC categories: a trained model with confidence gating, sovereign language AI for Indian languages, and a human in the loop.",
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  readMinutes: 7,
  keywords: [
    "ONDC classification AI",
    "MSME classification model",
    "sovereign AI India",
    "explainable AI government",
    "VargBot",
    "ONDC taxonomy",
  ],
  hindiTagline: "VargBot कैसे काम करता है — पूरी पारदर्शिता के साथ।",
  tldr:
    "VargBot is not one big black box — it is a layered system. A compact classifier trained on 19,600 labelled product–category pairs answers first (98.6% accuracy on held-out test data, validated with 5-fold cross-validation), but only when its confidence clears a threshold. Below that threshold — or for Indic-script text and unusual products — a sovereign Indian language model takes over. Every result carries a confidence band (green/yellow/red), a plain-language reason, and an honest stamp naming which engine actually produced it. Low-confidence cases go to a human officer, never silently through.",
  sections: [
    {
      heading: "The problem: 400+ categories, every Indian language",
      paragraphs: [
        "ONDC organises commerce into domains — Grocery, Fashion, Home & Kitchen and more — with hundreds of leaf categories beneath them. A brass-diya workshop in Moradabad, a saree weaver in Varanasi and a pump manufacturer in Coimbatore all need to land in exactly the right place, because that placement decides which buyers and seller apps ever see them.",
        "The input is messy by design: business owners describe what they sell in their own words — Hindi, Tamil, Hinglish, a product list in Excel, or a voice note. The classifier's job is to turn that into a precise taxonomy position without asking the owner to learn taxonomy jargon.",
      ],
    },
    {
      heading: "Layer 1: a trained model that knows when it doesn't know",
      diagram: { id: "vargbot-chain", caption: "VargBot's layered chain: the trained model answers when confident, the language model handles the hard cases, and every result carries an honest engine stamp." },
      paragraphs: [
        "The first layer is a compact text-classification model trained on 19,600 labelled product-description-to-category pairs. On held-out test data it reaches 98.6% domain accuracy (0.961 macro-F1), with stratified 5-fold cross-validation confirming stability (0.946 ± 0.010).",
        "The important design choice is not the accuracy — it is the gate. The model only answers when its confidence clears a threshold. A model that answers everything is dangerous in a government workflow; a model that knows when to hand over is trustworthy. Small trained models are also fast, cheap, fully auditable, and run entirely on our own infrastructure.",
      ],
    },
    {
      heading: "Layer 2: sovereign language AI for the hard cases",
      paragraphs: [
        "When the trained model isn't confident — or when the description arrives in Indic scripts, code-mixed speech, or covers products outside the training corpus — a sovereign Indian large language model resolves the classification, including the leaf category and product attributes. The same layer reads meaning from descriptions like 'हम मुरादाबाद में पीतल के दीये बनाते हैं' without translation loss.",
        "If both AI layers fail — a network outage, an unusual edge case — a deterministic keyword rule engine gives a baseline answer. Nothing in the pipeline pretends: every result is stamped with the engine that actually produced it, and a fallback is labelled as a fallback.",
      ],
    },
    {
      heading: "Confidence bands and the human in the loop",
      paragraphs: [
        "Every classification is shown with a band: green (high confidence), yellow (review advised), red (needs human judgement). The bands are not decoration — red and low-yellow cases route to the NSIC review queue, where an officer sees the AI's top-3 alternatives, its written reasoning, and makes the official call.",
        "This mirrors how India's best government AI systems work — risk-based routing with humans deciding the consequential cases — and it is why every AI decision on MSMEMate lands in an immutable audit trail an officer can inspect.",
      ],
    },
    {
      heading: "Why we didn't just use one giant model",
      paragraphs: ["Five reasons, each of them deliberate:"],
      list: [
        "Sovereignty — all inference runs on Indian infrastructure and Indian AI services; business data never reaches foreign AI APIs.",
        "Cost and speed — the trained model answers most cases in milliseconds, reserving the language model for where it earns its keep.",
        "Auditability — a compact model's behaviour can be evaluated, versioned and explained to a reviewer; every engine decision is logged.",
        "Honesty — separate engines with separate stamps mean we can never accidentally dress up a keyword fallback as AI.",
        "Upgradability — the gate design means a stronger fine-tuned Indic model can replace layer 1 without changing anything the user sees.",
      ],
    },
  ],
  faq: [
    {
      q: "What happens if VargBot classifies my business wrongly?",
      a: "You see the top-3 predictions with reasons and can trigger reclassification with a better description or product file. Low-confidence results automatically go to a human officer at NSIC — a wrong AI guess never silently becomes your official category.",
    },
    {
      q: "Does my business data train someone else's AI?",
      a: "No. Your data is processed only to classify and match your business, under India's DPDP Act 2023, on Indian infrastructure. It is not sold and not used to train third-party models.",
    },
    {
      q: "Which languages does the classifier understand?",
      a: "Descriptions work in Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, English and code-mixed Hinglish — typed or spoken. The sovereign language layer handles Indic scripts natively rather than translating first.",
    },
    {
      q: "How accurate is it really?",
      a: "The trained first layer scores 98.6% domain accuracy on held-out test data with 5-fold cross-validation at 0.946 ± 0.010 — and, more importantly, it declines to answer when unsure, handing those cases to the language model or a human reviewer.",
    },
  ],
});

BLOG_POSTS.push({
  slug: "claims-copilot-team-verification",
  title: "The Claims Copilot: How AI Helps NSIC Verify MSME TEAM Incentive Claims",
  metaTitle: "Claims Copilot — AI Verification for MSME TEAM Claims",
  description:
    "Inside MSMEMate's officer tool that automates TEAM scheme claim checks — Udyam validation, SKU caps, duplicate detection, risk scoring — with humans making every final call.",
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  readMinutes: 6,
  keywords: [
    "TEAM claim verification",
    "NSIC claims",
    "AI fraud detection government",
    "SNP incentive claims",
    "MSME TEAM scheme claims",
    "risk-based verification",
  ],
  hindiTagline: "दावों की जाँच — तेज़, पारदर्शी, और इंसान की निगरानी में।",
  tldr:
    "Under the MSME TEAM scheme, seller apps earn milestone incentives for every MSE they onboard — and NSIC must verify each claim against Udyam validity, enterprise size, activity type, SKU caps and live-catalogue evidence, largely by hand today. MSMEMate's Claims Copilot automates that documented checklist, scores every claim for risk so officers review by exception, and blocks approval while any rule fails. Officers make every final decision, and each one lands in an immutable audit trail.",
  sections: [
    {
      heading: "The bottleneck the scheme itself names",
      paragraphs: [
        "The IndiaAI Innovation Challenge 2026 describes the TEAM workflow as relying on 'labour-intensive claim verification by NSIC'. The arithmetic explains why: incentives are milestone-based per MSE — ₹450 for onboarding, catalogue support of ₹50 per SKU (up to 50 B2C) or ₹125 per SKU (up to 20 B2B) capped at ₹2,500, account management up to ₹5,000 linked to transactions. Every claim must be checked against a rulebook before public money moves.",
        "Each check is individually simple; multiplied across lakhs of MSEs and hundreds of seller apps, it becomes the bottleneck.",
      ],
    },
    {
      heading: "What the Copilot automates",
      diagram: { id: "claims-flow", caption: "A claim flows through automated rule checks and risk scoring — but only a named officer can decide, and every decision is audit-logged." },
      paragraphs: ["Every claim runs the official checklist automatically:"],
      list: [
        "Udyam number format and validity of the underlying registration.",
        "Enterprise is Micro or Small, with Manufacturing or Services as major activity — the scheme's hard gates.",
        "One SNP per MSE — duplicate claims across seller apps are caught network-wide, instantly.",
        "Catalogue actually live on ONDC, with SKU counts checked against the B2C/B2B caps.",
        "Claimed amount recomputed against the scheme's own arithmetic — over-billing shows in red.",
      ],
    },
    {
      heading: "Risk scoring: review by exception",
      paragraphs: [
        "Beyond pass/fail rules, each claim gets anomaly signals — SKU counts sitting exactly at the incentive cap, an MSE outside the seller app's declared coverage, a catalogue nobody can observe on the network — and a green/yellow/red risk band. Officers spend their attention on red, clear green in bulk, and every claim shows exactly why it scored what it scored.",
        "This is the pattern India's most successful government AI already uses: GST's analytics flag risky filings for human scrutiny, income-tax assessment allocates cases by risk, and GeM's fraud analytics won national awards doing the same for procurement. The Copilot brings that playbook to TEAM claims.",
      ],
    },
    {
      heading: "Humans stay the authority",
      paragraphs: [
        "The Copilot cannot approve anything on its own — and the interface refuses to let an officer approve a claim while any rule fails. Approvals and flags are made by named officers, persisted with their identity and timestamp, and written to the same immutable audit trail that records every AI decision on the platform.",
        "Transparency note: until the TEAM portal exposes a live claims feed, the Copilot runs on a clearly-stamped simulated queue built from registered businesses and real ONDC registry seller apps — the rule engine, risk scoring and audit trail are fully real.",
      ],
    },
  ],
  faq: [
    {
      q: "Does the AI reject claims automatically?",
      a: "No. The Copilot checks rules and scores risk; only a named NSIC officer can approve or flag a claim, and the system blocks approval while any check fails. Every decision is recorded in an immutable audit trail.",
    },
    {
      q: "What stops a seller app from claiming the same MSE twice?",
      a: "The one-SNP-per-MSE rule is enforced network-wide: the Copilot sees all claims across all seller apps at once, so a duplicate claim is flagged the moment it enters the queue — a check that is slow and error-prone to do manually.",
    },
    {
      q: "How does the Copilot know a catalogue is really live on ONDC?",
      a: "ONDC's observability framework makes catalogue status machine-verifiable — whether a seller's items actually appear on the network. That evidence, not a self-declaration alone, is what the catalogue-live check is designed to consume.",
    },
    {
      q: "Is this using real government claims data?",
      a: "Not yet — and it says so on screen. The demo queue is simulated from registered businesses and real registry seller apps, stamped as such. The moment a TEAM portal claims feed exists, the same rule engine runs on it unchanged.",
    },
  ],
});

BLOG_POSTS.push({
  slug: "mlops-honest-ai-lifecycle",
  title: "The MLOps Playbook Behind MSMEMate: How We Ship Honest AI",
  metaTitle: "MLOps for Sovereign AI — MSMEMate's Honest ML Lifecycle",
  description:
    "How a small team runs a full ML lifecycle for government-grade AI: data lineage, honest evaluation, calibrated confidence gates, drift monitoring, a human feedback flywheel, CI model gates and a DVC pipeline.",
  datePublished: "2026-07-12",
  dateModified: "2026-07-12",
  readMinutes: 8,
  keywords: [
    "MLOps India",
    "ML lifecycle best practices",
    "sovereign AI MLOps",
    "model drift monitoring",
    "human in the loop AI",
    "DVC pipeline",
    "responsible AI government",
  ],
  hindiTagline: "ईमानदार AI — हर मॉडल का पूरा जीवन-चक्र, निगरानी के साथ।",
  tldr:
    "An AI system that routes public-scheme benefits cannot be a black box that was accurate once, at launch. MSMEMate runs a complete ML lifecycle around its classification model: every training row carries its source, every metric is reported with its weaknesses disclosed, every prediction is stamped with the exact engine that produced it, a live dashboard watches for drift against the frozen training baseline, officer decisions flow back as retraining data, and CI refuses to deploy an artifact that fails behavioural smoke tests. This post walks through each practice and why it exists.",
  sections: [
    {
      heading: "Why lifecycle matters more than launch accuracy",
      diagram: { id: "mlops-loop", caption: "The MLOps loop: data with lineage trains a model, honest evaluation gates deployment, monitoring watches for drift, and officer feedback becomes the next round of training data." },
      paragraphs: [
        "A model's accuracy on the day it ships is a snapshot. The world underneath it moves: new kinds of businesses register, vocabulary shifts, upstream services change behaviour. For AI that touches government workflows — deciding which ONDC category a business belongs to, or which seller apps suit it — the real question is not 'how accurate was it at launch?' but 'how will you know when it stops being accurate, and what happens then?'",
        "That question is what MLOps answers. Here is the lifecycle we run, end to end: data with lineage → training with a locked evaluation protocol → versioned, stamped artifacts → gated deployment → drift monitoring → human feedback → retraining. Each stage below is live in production today.",
      ],
    },
    {
      heading: "Data: every row knows where it came from",
      paragraphs: [
        "VargBot v2 trains on 33,500 labelled examples from four sources: real e-commerce product listings, real product names from Andhra Pradesh's MEPMA self-help-group sellers, business descriptions derived from real Udyog registration data, and — only for the six ONDC domains nothing else covered — template-generated text built from the official taxonomy's own category names.",
        "Every row carries a source column. The corpus builder is a deterministic, seeded script, so the exact dataset can be rebuilt from its inputs on any machine. This is data lineage in its simplest useful form: when a prediction looks wrong, we can trace what kind of data taught the model that behaviour.",
      ],
    },
    {
      heading: "Evaluation: report the number that makes you look worse",
      paragraphs: [
        "The protocol is standard and locked: stratified 80/10/10 split, hyperparameters tuned only on validation, 5-fold cross-validation for stability, and a test set touched exactly once. VargBot v2 scores 98.9% held-out accuracy with cross-validation at 0.984 ± 0.001.",
        "But the more important number is the one we publish next to it: on real product text alone — excluding the template-generated rows whose near-duplicates appear on both sides of the split — accuracy is 98.5% and macro-F1 drops from 0.987 to 0.957. The evaluation report carries a written honesty note explaining exactly why the headline number is optimistic. If your eval report only contains numbers that flatter the model, it is marketing, not evaluation.",
      ],
    },
    {
      heading: "Confidence you can act on: the calibrated gate",
      paragraphs: [
        "The trained model only answers when its confidence clears a gate; below it, the case routes to a language model that handles Indic scripts and unusual text, and ultimately to a human reviewer. In v2 the gate stopped being a guess: we compute a full threshold-versus-precision table on validation data, and the shipped gate (0.55) corresponds to a measured coverage/precision trade-off. Saying 'the model is 95% confident' only means something if someone checked what 95% actually delivers.",
      ],
    },
    {
      heading: "Versioning and honest stamps",
      paragraphs: [
        "Model artifacts are versioned (v1 stays deployable for instant rollback via one environment variable), the training library version is pinned identically in training and serving, and — the part we consider non-negotiable — every stored prediction carries the exact engine that produced it: the trained model, the language model, or the keyword fallback. No result ever wears a label it did not earn. That per-prediction lineage is what makes everything downstream possible.",
      ],
      list: [
        "Reproducible pipeline: dvc repro re-runs corpus build → training → artifact deployment as a declared DAG with dependency tracking.",
        "Model card: a published document covering architecture, data, metrics, limitations and ethics (docs/MODEL_CARD_VARGBOT.md).",
        "CI model gate: the build fails if the shipped artifact loses domain coverage, regresses on canonical Hinglish/English inputs, or stops deferring on ambiguous text.",
      ],
    },
    {
      heading: "Monitoring: the model watches itself, officers watch the model",
      paragraphs: [
        "The NSIC dashboard includes a Model Health monitor built entirely from data the platform already records: weekly confidence trends (average and 25th percentile), the mix of engines answering live traffic, how often officers reject registrations or override the AI's recommendations, and per-domain live confidence compared against the frozen evaluation baseline from training day.",
        "Thresholds turn the card red when the fallback share or override rate climbs past configured limits — a plain-language signal that says 'time to retrain', backed by the exact evidence. Drift detection is not an enterprise luxury; ours is a read-only analytics layer over records an honest system was already keeping.",
      ],
    },
    {
      heading: "The feedback flywheel: humans close the loop",
      paragraphs: [
        "Every officer decision — approving a registration, rejecting one, overriding a recommended seller app — is recorded anyway for auditability. A dedicated export turns those decisions into weak-supervision retraining data, clearly labelled with what an approval does and does not confirm. Monitoring tells us when to retrain; the feedback export supplies human-vetted data to retrain with; the same locked evaluation protocol decides whether the new model actually earns its way to production. That loop — not any single model — is the product.",
        "What about reinforcement learning? For a supervised classifier, true RL does not apply — but the feedback flywheel is its philosophical cousin: the system learns from human judgment over time. Genuine RL (contextual bandits over match acceptance) is a plausible future for the matching engine, once live acceptance data accumulates.",
      ],
    },
    {
      heading: "What we deliberately do not do (yet)",
      paragraphs: [
        "Honest MLOps also means not cosplaying at scale. We skip experiment-tracking servers (two model versions live comfortably in versioned JSON reports), canary infrastructure (traffic does not justify it; env-var rollback covers us), and feature stores. Each becomes worth adopting at a defined trigger — more models, more traffic, more people — and the DVC remote for large artifacts is the first upgrade queued.",
      ],
    },
  ],
  faq: [
    {
      q: "What is MLOps in simple terms?",
      a: "MLOps is the discipline of treating a machine-learning model like a living system rather than a one-time deliverable: versioning its data and code, testing it before deployment, monitoring it in production for degradation, and feeding real-world feedback back into retraining.",
    },
    {
      q: "How does MSMEMate know when its model degrades?",
      a: "A live Model Health dashboard tracks weekly confidence trends, which engine answered each request, officer override rates, and per-domain confidence against the frozen training baseline. Configured thresholds raise a red alert recommending retraining — with the evidence attached.",
    },
    {
      q: "Does MSMEMate use reinforcement learning?",
      a: "Not for classification — RL does not fit supervised text classification. The closest live mechanism is the human feedback flywheel: officer decisions are exported as weak-supervision training data for periodic retraining. Contextual bandits over match acceptance are a possible future for the matching engine.",
    },
    {
      q: "Why publish the lower accuracy number?",
      a: "Because part of the evaluation data is template-generated and inflates the headline score. Publishing the real-data-only figure (98.5%, macro-F1 0.957) alongside the headline (98.9%, 0.987) with a written explanation is what makes the evaluation trustworthy — for a government-facing system, credibility compounds faster than optics.",
    },
  ],
});

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
