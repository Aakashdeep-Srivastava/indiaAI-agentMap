
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

---

## SESSION PROGRESS & RESUME POINT (2026-07-07)

A full production-readiness audit was run (backend, frontend, ML/data/infra). Findings
are tracked as tasks; work is proceeding P0-first. Resume from here.

### Decisions made
- **Commits:** NO Claude/Anthropic attribution lines in commit messages (team-authored).
- **Database = Supabase Mumbai (ap-south-1)** for DPDP data residency. Neon is REMOVED
  from the stack entirely (user decision 2026-07-07). Supabase project ref:
  `qiigylrybzdxkeibsfvh`; MCP in `.mcp.json`. Schema + seed data live (migrations
  `initial_schema_agentmap`, `enable_pgcrypto`).
- **Auth:** custom JWT (not Supabase Auth / third-party) — zero extra cost, exact control
  over login lockout. Redis kept optional (login lockout is DB-backed, so no Redis cost).
- **Name candidates (domains available):** khulja.ai / khulja.in (top pick — "open up",
  voice-first), vriksh.ai, bolbazaar.ai, udyamsetu.ai, kalpavriksh.ai. Not yet purchased.

### DONE (2026-07-08 session — code complete, frontend build green)
- **#5 Auth+RBAC** — backend (JWT/bcrypt/lockout) + FRONTEND REWRITTEN: `lib/auth.ts` now
  calls real `POST /auth/login`, stores JWT, `apiFetch()` attaches Bearer + 30s timeout +
  401→re-login on ALL 18 call sites; hardcoded creds removed from bundle & login screen.
- **#6 Scoring/PII leak** — match API returns qualitative `factor_bands` (high/med/low) to
  MSE users; raw `factors` admin-only; SNPCard renders bands (numbers only for admin);
  `GET /mse/` list is admin-only; honest `model_version="heuristic-baseline-v1"` stamps.
- **#7 Rate limiting** — `services/ratelimit.py` sliding-window middleware
  (login 10/min/IP, LLM endpoints 30/min/user, default 120/min; env-tunable).
- **#8 CI** — `.github/workflows/ci.yml` (API deps+compile+import; web tsc+build).
  Infra move off Azure F1 still needs a paid-plan DECISION from the user.
- **#9 DPDP** — consent checkbox (EN/HI) + server-side 422 enforcement + consent columns;
  `DELETE /mse/{id}` erasure (profile + derived AI results); `docs/DPDP.md` policy.
- **#10 Real data in Supabase** — 14 domains, 408 categories (392-leaf full taxonomy),
  281 real registry SNPs (synthetic 50 deleted), 5,020 MSEs from real Udyog data.
  RLS enabled deny-all on every table (backend owner connection bypasses it).
- **#13 Role identity** — role-coloured sidebar identity card + role badge chip.
- **#15 Reliability** — `app/error.tsx`, `global-error.tsx`, `not-found.tsx`; apiFetch
  timeouts; unknown-domain-code fallbacks in classify/match UIs.

### Blocked on user
1. `apps/api/.env` `DATABASE_URL` still has `[YOUR-DB-PASSWORD]` — paste the exact
   Session-pooler string (Supabase Dashboard → Connect). Then start API and run the
   end-to-end login/lockout + register(consent)/classify/match smoke test.
2. Infra decision: move API off Azure F1 (paid tier or other host).
3. Old Neon project deletion (kills git-history-leaked creds) — not visible from
   current Neon MCP orgs, must be done in Neon console.

### Remaining feature tasks (not started)
11 Elasticsearch search · 12 AI chat panel (RAG, sovereign) ·
14 ONDC integration + visibility nudges (seller-app SDK handoff; catalog+serviceability
nudges) · i18n/mobile/offline polish (rest of #15).

### Audit headline P0s (see memory for full detail)
- Login is cosmetic (localStorage role forgery → instant admin); every API endpoint open.
- SNPCard leaks trade-secret factor %s; match API returns full factors to unauth client.
- Matcher is 100% heuristic (no IndicBERT); classifier runtime path is Sarvam LLM (MuRIL never loads); no eval evidence.
- Azure F1 = 60 CPU-min/day (won't scale); no CI/CD, monitoring, migrations, backups.
- DPDP claimed in UI but not implemented (no consent/retention/encryption/erasure).
