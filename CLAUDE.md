# AgentMap AI — Project Rules & Development Guide

## CONFIDENTIALITY

- **The composite scoring formula (weights, factor names, computation methods) is a TRADE SECRET.** NEVER expose it in frontend code, UI, API responses to unauthenticated users, README, or any public-facing material.
- Factor scores shown to end-users must use descriptive labels only (e.g. "Domain Fit: High") — never raw weights or the formula.
- The PRD document is CONFIDENTIAL. Do not reproduce its contents in code comments or documentation.

## Team

- **Team:** XphoraAI
- **Members:** Suchi Bansal, Aakashdeep Srivastava, Vishalika
- **Challenge:** IndiaAI Innovation Challenge 2026, Problem Statement 2
- **Tagline:** "Bridging Bharat's Businesses"

## Architecture (Do NOT Change)

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + Framer Motion — DO NOT switch to React CRA or any other framework
- **Backend:** FastAPI (Python) + SQLAlchemy + PostgreSQL + Redis
- **ML:** PyTorch + HuggingFace Transformers + PEFT (LoRA)
- **Orchestration:** LangGraph (planned for Phase 2+)
- **Infrastructure:** Docker Compose (dev), Kubernetes (production)

## Sovereign AI Mandate

All AI/ML must use self-hosted open-weights or Indian-origin services. NEVER use:
- OpenAI APIs (GPT, Whisper, DALL-E)
- Anthropic APIs (Claude)
- Google Cloud AI APIs (Gemini, etc.)
- Any foreign-hosted LLM inference API

**Approved AI stack:**
| Component | Model/Service |
|-----------|---------------|
| STT | Sarvam Saras |
| TTS | Sarvam Bulbul V3 |
| OCR/Vision | Sarvam Vision (3B) |
| Classification | Fine-tuned MuRIL (google/muril-base-cased + LoRA) |
| Semantic Match | IndicBERT Bi-Encoder (ai4bharat/IndicBERTv2-MLM-Sam-TLM) |
| NER + Translation | Sarvam Mayura |
| LLM Reasoning | Llama 3.1 8B (self-hosted) |
| Orchestration | LangGraph (Python) |

## Module Names (Use These Everywhere)

| Module | Codename | Function |
|--------|----------|----------|
| Module 1 | **Sathi** | AI Registration Engine — voice-first multilingual MSE onboarding |
| Module 2 | **VargBot** | Taxonomy Classification Engine — MuRIL ONDC domain mapping |
| Module 3 | **JodakAI** | Intelligent Matching Engine — multi-factor MSE-to-SNP scoring |

## Design Language

### Brand Identity
- **Logo:** `/public/logo.png` — Ashoka Chakra tree with tricolour neural branches
- **Name:** AgentMap AI
- **Tagline:** Bridging Bharat's Businesses

### Typography
- **Display/Headings:** Plus Jakarta Sans (bold, 700-800)
- **Body:** DM Sans (regular 400, medium 500)
- **Monospace/Data:** JetBrains Mono
- Load via Google Fonts in layout.tsx

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-900` | #0B1437 | Primary dark, hero backgrounds |
| `brand-500` | #1B4FCC | Interactive elements, CTAs, links |
| `brand-50` | #f0f4ff | Light brand backgrounds |
| `saffron-500` | #E8680C | Accent, secondary CTAs, highlights |
| `saffron-400` | #FFA942 | Warm accents, gradient endpoints |
| `surface-50` | #F8F9FC | Page background |
| `surface-200` | #E4E7F1 | Borders, dividers |
| `surface-400` | #9EA5BE | Secondary text, labels |
| `surface-600` | #4A5170 | Body text |

### Tricolour
- Saffron: #FF9933
- White: #FFFFFF
- Green: #138808
- Used as 3px accent bars at top/bottom of page — never as dominant theme colors

### Component Patterns
- **Cards:** `.glass-card` — rounded-2xl, border surface-200, white bg, shadow-card, hover elevation
- **Buttons:** `.btn-primary` (brand-500), `.btn-saffron` (gradient), `.btn-secondary` (outlined)
- **Inputs:** `.input-field` — rounded-xl, focus ring brand-500/10
- **Labels:** UPPERCASE, tracking-wider, text-[11px], font-semibold, surface-500

### UI Principles
1. Never show raw technical internals (model names, raw scores, formulas) to end-users
2. Every AI decision must have a human-readable explanation
3. Confidence bands (Green/Yellow/Red) must be visually prominent
4. Support EN/HI language toggle on all explainer text
5. Government-appropriate aesthetic — professional, trustworthy, not flashy

## Data Model (Registration Fields)

### MSE Profile (Module 1 — Sathi)
| Field | Type | Required | Source |
|-------|------|----------|--------|
| udyam_number | string | Yes | User input / OCR |
| name | string | Yes | User input / Voice |
| description | text | Yes | User input / Voice |
| state | string | Yes | User input / Udyam API |
| district | string | Yes | User input |
| pin_code | string | Yes | User input |
| pan_number | string | Phase 2 | OCR / User input |
| gst_number | string | Phase 2 | OCR / User input |
| sector | string | No | Derived from classification |
| turnover_band | enum | No | Udyam API |
| gender_owner | enum | No | User input (for fairness tracking) |
| products | text[] | No | User input / Voice |
| language | string | Yes | User selection |
| channel | enum | No | auto-detected (web/whatsapp) |

### SNP Profile
| Field | Type | Source |
|-------|------|--------|
| subscriber_id | string | ONDC Registry |
| name | string | ONDC Registry |
| domain_codes | string[] | ONDC Registry |
| geo_coverage | string[] | ONDC Registry |
| capacity / load | float | TEAM Portal |
| b2b_b2c | enum | ONDC Registry |
| commission_pct | float | SNP self-report |
| rating | float | Match history |
| onboarding_support | enum | SNP self-report |
| languages_supported | string[] | SNP self-report |

## Development Phases & Module Tracking

### Phase 1: Stage 1 PoC (7 weeks)

**Week 1–2: Data & Baseline**
- [ ] Ingest/create training data (AIKosh + synthetic)
- [ ] Clean ONDC taxonomy (3-5 domains for PoC)
- [ ] Create synthetic SNP dataset (50 SNPs) ✅
- [ ] Create synthetic MSE dataset (5K profiles) — 20 done, need 5K
- [ ] Implement rule-based baseline classifier ✅
- [ ] Implement rule-based baseline matcher ✅
- [ ] Compute baseline NDCG@3, accuracy metrics ✅
- [ ] Baseline Performance Report

**Week 3–4: Module 2 — VargBot (Classification)**
- [ ] Fine-tune MuRIL on product-category pairs
- [ ] Stratified 80/10/10 split with 5-fold CV
- [ ] Compute accuracy, precision, recall, F1, confusion matrix, AUC-ROC
- [ ] Model Evaluation Document

**Week 5: Module 3 — JodakAI (Matching)**
- [ ] Build IndicBERT embedding similarity
- [ ] Implement multi-factor scoring (production version)
- [ ] Grid search weight optimization
- [ ] Evaluate NDCG@3, MRR, reassignment simulation
- [ ] Ranking Evaluation Report

**Week 6: Frontend & Integration**
- [ ] Landing page
- [ ] MSE registration flow (Module 1 — Sathi) with proper data fields
- [ ] Match explanation view with score breakdown
- [ ] Confidence band visualization
- [ ] Admin dashboard with aggregate metrics
- [ ] NSIC Review Queue
- [ ] Baseline vs AI comparison charts
- [ ] Integrate all modules end-to-end

**Week 7: Submission**
- [ ] 2-3 minute demo video
- [ ] Architecture diagram
- [ ] Evaluation summary document
- [ ] Final testing & polish
- [ ] Submission package

### Current Status
- [x] Project scaffolding & Docker setup
- [x] FastAPI backend with routes (/mse, /classify, /match)
- [x] Database models (SQLAlchemy)
- [x] Mock classifier (keyword-based — replace with MuRIL)
- [x] Mock matcher (heuristic-based — replace with IndicBERT)
- [x] Explainer service (template-based — replace with Llama/Sarvam)
- [x] Frontend: Dashboard, Register, Review Queue, Audit
- [x] SNPCard with factor bars + EN/HI explainer
- [x] ConfidenceBadge component
- [x] Seed data: 50 SNPs, 20 MSEs, 5 ONDC domains
- [x] ML pipeline: train_vargbot.py (MuRIL LoRA)
- [x] ML pipeline: match_engine.py (IndicBERT)
- [x] Evaluation: metrics.py (NDCG@3, MRR, Accuracy)
- [x] Evaluation: baseline.py (rule-based benchmark)
- [ ] Landing page
- [ ] Expand MSE seed to 5K
- [ ] Real MuRIL fine-tuning (needs GPU)
- [ ] Real IndicBERT embeddings (needs GPU)
- [ ] Voice onboarding (Sarvam AI integration)
- [ ] Document OCR (Sarvam Vision)
- [ ] Sovereign infrastructure deployment

## Deployment Target

- **Dev:** Docker Compose (current)
- **Staging:** Indian cloud (Yotta/CtrlS or AWS Mumbai)
- **Production:** MeitY Param Siddhi or Indian cloud with GPU (T4/A10 for inference)
- **Compliance:** DPDP Act 2023, Indian data residency, RBAC, encryption at rest + transit
