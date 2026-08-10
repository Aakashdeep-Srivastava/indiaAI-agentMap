
# MSMEMate — Project Rules & Development Guide

> Product renamed from "AgentMap AI" to **MSMEMate** on 2026-07-08.
> Live at https://www.msmemate.com (frontend) + agentmap-api.azurewebsites.net (API).
> Azure/infra resource names keep the legacy `agentmap-*` prefix — do NOT recreate them.
> **This repo is PUBLIC.** Anything committed here is public-facing material.

## CONFIDENTIALITY

- **The composite scoring formula (weights, factor names, computation methods) is a TRADE SECRET.** NEVER expose it in frontend code, UI, API responses to unauthenticated users, README, or any public-facing material.
- Factor scores shown to end-users must use descriptive labels only (e.g. "Domain Fit: High") — never raw weights or the formula.
- The formula lives in `apps/api/services/matcher.py`. Refer to it by name, never reproduce it in docs, comments, notebooks, or this file.
- The PRD document is CONFIDENTIAL. Do not reproduce its contents in code comments or documentation.
- ⚠️ **The trade-secret claim is currently unenforceable — see "Open items" #1.** `README.md` and `ml/pipelines/match_engine.py` were redacted on 2026-08-09, but `matcher.py` holds the same weights and **the repo is public**, so "server-side only" ≠ private. Awaiting a user decision (repo private / weights to secret config / accept disclosure). Until then, treat the weighting as **disclosed** and do not build claims on its secrecy.

## Team

- **Team:** XphoraAI
- **Members:** Suchi Bansal, Aakashdeep Srivastava, Vishalika
- **Challenge:** IndiaAI Innovation Challenge 2026, Problem Statement 2
- **Tagline:** "Bridging Bharat's Businesses"

## Architecture (Do NOT Change)

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + Framer Motion — DO NOT switch to React CRA or any other framework
- **Backend:** FastAPI (Python 3.11) + SQLAlchemy + PostgreSQL (Supabase Mumbai)
- **ML (serving):** scikit-learn TF-IDF + LogisticRegression artifact, loaded at API startup
- **ML (research):** PyTorch + HuggingFace Transformers + PEFT (LoRA) — `ml/pipelines/`, NOT in the serving path
- **Orchestration:** LangGraph (planned for Phase 2+, not implemented)
- **Infrastructure:** Azure App Service (API) + Vercel (web) + Supabase (DB). Docker Compose exists but is dev-optional.

## Sovereign AI Mandate

All AI/ML must use self-hosted open-weights or Indian-origin services. NEVER use:
- OpenAI APIs (GPT, Whisper, DALL-E)
- Anthropic APIs (Claude)
- Google Cloud AI APIs (Gemini, etc.)
- Any foreign-hosted LLM inference API

### AI stack — what is ACTUALLY in the serving path (keep this honest)

| Component | Shipped today | Engine stamp emitted |
|-----------|---------------|----------------------|
| STT | Sarvam Saras (`saarika:v2.5`) → Azure Speech secondary → mock | `sarvam-saras` / `fallback-stt` / `mock` |
| TTS | Sarvam Bulbul V3 (`bulbul:v3`, speaker `ritu`) → mock | `sarvam-bulbul-v3` / `mock` |
| OCR | pypdf text layer → Sarvam Document Intelligence → Azure DocInt secondary → mock | `pdf-text` / `sarvam-vision` / `fallback-ocr` / `mock` (+`+sarvam-30b` when NER runs) |
| NER | Sarvam-30B chat → regex fallback | `sarvam-30b` / `regex` |
| Classification | **VargBot TF-IDF v2 artifact** (gate 0.55) → Sarvam-30B leaf resolution → keyword | `vargbot-tfidf-v2+sarvam-30b` / `vargbot-tfidf-v2` / `sarvam-llm` / `keyword-fallback` |
| Matching | JodakAI `weighted-multifactor-v2` (deterministic, server-side) | `weighted-multifactor-v2` |
| Explainer | Template-based EN/HI, **no AI call** | n/a |

**Aspirational / research-only (NOT serving):** MuRIL + LoRA fine-tune (`ml/pipelines/train_vargbot.py`), IndicBERT bi-encoder (`ml/pipelines/match_engine.py`), Llama 3.1 8B reasoning, LangGraph.
The MuRIL branch in `classifier.py` is unreachable in production — `apps/api/requirements.txt` ships no `torch`/`transformers`/`peft`.

**Rule: never stamp an engine name the code did not actually run.** Fallback output is labelled as fallback.

## Module Names (Use These Everywhere)

| Module | Codename | Function |
|--------|----------|----------|
| Module 1 | **Sathi** | AI Registration Engine — voice-first multilingual MSE onboarding |
| Module 2 | **VargBot** | Taxonomy Classification Engine — ONDC domain + leaf mapping |
| Module 3 | **JodakAI** | Intelligent Matching Engine — multi-factor MSE-to-SNP scoring |

Beyond the three PS2 modules, two officer-facing products have shipped: **Catalogue Studio** (ONDC template + Beckn payload) and **Claims Copilot** (TEAM incentive verification).

## Design Language

### Brand Identity
- **Logo:** handshake-M mark — favicon, PWA icons, navbar, footer (regenerate via `scripts/generate-icons.mjs`)
- **Name:** MSMEMate (wordmark styled as MSME + Mate two-tone; renamed from AgentMap AI 2026-07-08)
- **Domain:** msmemate.com (Vercel production alias)
- **Tagline:** Bridging Bharat's Businesses

### Typography
- **Display/Headings:** Plus Jakarta Sans (`--font-display`, bold 700-800)
- **Body:** DM Sans (`--font-body`, regular 400, medium 500)
- **Monospace/Data:** JetBrains Mono (`--font-mono`)
- Loaded via `next/font` in `app/layout.tsx`, all `display: swap`

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
- Saffron: #FF9933 · White: #FFFFFF · Green: #138808
- Used as 3px accent bars at top/bottom of page — never as dominant theme colors
- Diagram convention: blue = AI, saffron = human, green = outcome

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

---

# SHIPPED FEATURE INVENTORY (authoritative — verified against the codebase 2026-07-20)

## Frontend — `apps/web` (Next.js 15.1, React 19, `output: standalone`)

Runtime deps are deliberately few: `framer-motion`, `lucide-react`, `leaflet`/`react-leaflet`. **No i18n library** — bilingual copy is hardcoded inline.

### Public marketing routes — group `app/(marketing)/`
Shell: tricolour bar + floating `Navbar` + heritage footer (`/footer-hero.webp`) + sitewide JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`).

| URL | Purpose |
|-----|---------|
| `/` | Landing — 8 sections: rotating hero frames, persona tabs `#solutions`, journey, before/after, dark stats band, resources, CTA `#about` |
| `/blog` + `/blog/[slug]` | 7 static posts; `Article` + `FAQPage` + `BreadcrumbList` JSON-LD |
| `/ondc` + `/ondc/[city]` | Cluster hub + **24 local-SEO city pages**; `Service` + `FAQPage` JSON-LD |
| `/dpdp` | DPDP Act 2023 posture — 6 pillars |
| `/sovereign-ai` | Sovereign-AI stance — 6 pillars |
| `/privacy` · `/terms` | Legal |

### Portal routes — group `app/(app)/`
Client gate in `app/(app)/layout.tsx`: no session → `/login`; `/register` is explicitly exempt (public entry point). Sidebar rail via `SidebarCollapsedContext`.

| URL | Purpose | Access |
|-----|---------|--------|
| `/register` | **Sathi** voice-first registration — `SathiVoicePanel` beside a live-filling TEAM-form; 28 states, multi-language | **Public** |
| `/classify` | **VargBot** domain/category classification (largest page, ~1580 ln) | mse + admin |
| `/match` | **JodakAI** ranked SNP recommendations + `ClusterMap` (`/dashboard` redirects here) | mse + admin |
| `/catalogue` | **Catalogue Studio** — template download, sheet upload, auto-categorisation, Beckn payload | mse + admin |
| `/certificate` | Print-ready Certificate of ONDC Onboarding Allocation (`?mseId=`) | mse + admin |
| `/upload` | Taxonomy upload — ⚠️ **MOCK ONLY**, renders 18 hardcoded rows, never calls the API | mse + admin |
| `/review` | NSIC review queue — approve/reject | **admin** |
| `/allocate` | Official SNP allocation — confirm or reassign the AI pick | **admin** |
| `/claims` | **Claims Copilot** — TEAM incentive rule checks, risk bands, officer decision | **admin** |
| `/audit` | Immutable audit trail of every AI decision | **admin** |
| `/model-health` | Drift dashboard + MLflow-style model registry | **admin** |

Admin gate list: `ADMIN_ONLY` in `lib/auth.ts` = `/review`, `/audit`, `/allocate`, `/claims`, `/model-health`.
Root-level: `/login` (role picker, no passcodes in the bundle), `app/error.tsx`, `global-error.tsx` (inline-styled, Tailwind-free), `not-found.tsx` (bilingual).

### Key components
`SNPCard` (composite score + qualitative `factor_bands` + fit reasons; numbers withheld from MSE users) · `ConfidenceBadge` (the core honesty primitive) · `DomainPredictionCard` (bands at 0.85/0.60) · `TaxonomyBrowser` · `ClassificationHistory` · `MSEPicker` (never exposes numeric IDs) · `ClusterMap` (Leaflet, `ssr:false`) · `VoiceInput` (30s cap → `/stt`) · `AppSidebar` (journey rail + OVERSIGHT block, 72px collapsed rail, propagates `?mseId=`) · `Navbar` (hide-on-scroll, dark/light variants) · `BlogDiagram` (4 inline SVGs, zero external assets, `role="img"` + aria-label).
`components/sathi/`: `SathiVoicePanel` (1319 ln — the shipped voice experience), `VoiceOrb`, `WaveformVisualizer`, `LiveTranscript`, `ProgressRing`, `ExtractedFieldCard`.

**Orphaned (unreachable from any route — do not extend, delete or revive deliberately):** `AppTopBar`, `FooterIllustration`, `SathiAgent` (superseded by `SathiVoicePanel`), `sathi/DocPreview`, `sathi/DocumentScanner`, `sathi/FieldStatusPanel`, `sathi/PermissionGate`, `sathi/DocUploadButton` (transitively). ~1,700 lines total.

### lib/
`auth.ts` — session in `localStorage["agentmap_session"]`, `login()`, `canAccess()`, and **`apiFetch()`** (base URL + Bearer + 30s `AbortSignal.timeout` + 401 → clear session → `/login`). Local role is a UI hint only; the server re-authorizes.
`blog.ts` (651 ln, static post source) · `cities.ts` (24 clusters) · `extractFields.ts` (13 fields, `/ner/extract` + regex fallback, `detectLanguage()`) · `useAudioAnalyzer.ts` (FFT 64, 24 bins) · `sidebar-context.tsx`.

### SEO / PWA
`app/layout.tsx` is the metadata hub (`metadataBase`, title template `%s | MSMEMate`, OG `en_IN`, robots, `viewportFit: cover`, light/dark themeColor).
`sitemap.ts` = 39 URLs (7 static + 7 posts + `/ondc` + 24 cities) · `robots.ts` (disallows portal routes) · `manifest.ts` (standalone, 5 icons, 2 shortcuts) · `public/llms.txt` (AI-answer-engine brief) · per-page `metadata` / `generateMetadata` on every marketing route.

## Backend — `apps/api` (FastAPI, 15 route modules, 27 endpoints)

> **Note:** the ORM lives in `database.py`. There is **no `models.py`** — `models/` is a directory of sklearn artifacts.

Auth is enforced in two layers: router-level `dependencies=` in `main.py` plus per-route `Depends(...)`. The stricter wins.

| Router | Prefix | Gate | Endpoints |
|--------|--------|------|-----------|
| `health` | — | public | `GET /health` |
| `auth` | `/auth` | public | `POST /login` (bcrypt + DB lockout + HS256 JWT, 429 when locked) · `GET /me` (JWT) |
| `domains` | `/domains` | public | `GET /` — domains + nested categories |
| `mse` | `/mse` | per-route | `POST /` public (requires `consent_given`, 409 dup Udyam, auto-creates an `mse` user + one-time passcode when anonymous) · `GET /` **admin** · `POST /{id}/review` **admin** · `POST /{id}/allocate` **admin** (409 unless approved) · `GET /search` JWT · `GET /{id}` JWT · `GET /{id}/clusters` JWT · `DELETE /{id}` **admin** (DPDP erasure) |
| `stt` `ocr` `tts` `ner` | resp. | **public** | `POST /stt/transcribe` · `POST /ocr/extract` · `POST /tts/synthesize` · `POST /ner/extract` |
| `classify` | `/classify` | JWT | `POST /` (persists result + leaf + audit) · `POST /text` (no DB write) · `GET /history/{mse_id}` · `POST /{result_id}/verify` **admin** — officer confirms/corrects a prediction; codes validated against the live taxonomy; the only source of **leaf-level gold labels** |
| `match` | `/match` | JWT | `POST /` — raw `factors` returned **only when `role == "admin"`**; MSE users get `factor_bands` |
| `catalogue` | `/catalogue` | JWT | `GET /template/{domain}` (3-sheet XLSX, 8 RET domains) · `POST /upload` (caps 500 rows, returns 100) |
| `audit` | `/audit` | **admin** | `GET /` (limit ≤ 200) |
| `claims` | `/claims` | **admin** | `GET /queue` · `POST /decide` |
| `model_health` | `/model-health` | **admin** | `GET /` (weeks 2–52) · `GET /feedback-export` (limit ≤ 5000) |

### Services
- **`classifier.py`** — the VargBot chain: TF-IDF `predict_proba` → if top-1 ≥ `VARGBOT_TFIDF_MIN_CONF` (0.55) the domain is fixed and Sarvam-30B resolves leaf + attributes with a `domain_hint`; else Sarvam zero-shot over the live-DB taxonomy (14 domains, 30 leaves/domain in-prompt); then MuRIL (unreachable), TF-IDF below gate, keyword frequency. Engine stamp derives from the artifact filename (`vargbot_tfidf_v2.joblib` → `vargbot-tfidf-v2`). Also exports `get_compliance_checklist()` (FSSAI / BIS-CRS / CDSCO / AYUSH / BEE + 4 generic).
- **`matcher.py`** — JodakAI `weighted-multifactor-v2`. Registry-aware: multi-category SNPs, undisclosed domain lists, pan-India geo; rating Bayesian-shrunk to a network prior (cold-start explore); capacity + onboarding speed blended from `data/snp_capacity.json` (**synthetic-disclosed**, pending TEAM-portal integration). Also `readiness_nudges()` (max 3) and `_fit_reasons()` (max 4). **Weights never leave the server.**
- **`ner.py`** — Sarvam-30B → regex. Own in-process limiter (30 rpm / 1000 daily); short text skips the LLM. Regex covers Udyam/mobile/email/PAN/GSTIN/PIN + 29 English states, 8 abbreviations, 21 Hindi state names.
- **`ocr.py`** — digital-PDF text layer (pypdf, 3 pages, `<40` chars falls through) → Sarvam DocInt (job upload/poll/download-zip, `DOCINT_TIMEOUT_S` 120) → Azure DocInt → mock. Every text path runs Udyam label regexes + LLM NER, then `_sanitize_fields()` (format validation + hallucination filter, drops known prompt-parroted artifacts). Doc triage: `udyam_certificate` / `incorporation_certificate` / `aoa` / `moa` / `gst_certificate` / `pan_card` / `business_document`; spreadsheets short-circuit to `doc-triage`.
- **`stt.py`** — Sarvam Saras (webm→WAV 16 kHz via `ffmpeg` when present) → Azure Speech → mock (8 languages). Every result carries `is_mock` + `detected_language`.
- **`tts.py`** — Bulbul v3; on mock the frontend falls back to browser `speechSynthesis`.
- **`explainer.py`** — pure EN/HI templates, qualitative labels only. No AI call.
- **`auth.py`** — bcrypt, HS256, DB-backed lockout, `get_current_user` / `require_admin` / `get_optional_user`. Logs `CRITICAL` if `JWT_SECRET` is unset.
- **`ratelimit.py`** — in-memory sliding window (60s). Buckets: `login`, `llm` (`/classify` `/match` `/ner` `/stt` `/tts` `/ocr`), `default`. Keys on bearer-token tail → `x-forwarded-for` → client host. OPTIONS bypasses. **Per-worker, not Redis-backed.**
- **`geo.py`** — 36 hardcoded state/UT centroids, no external call.
- `redis_client.py` exists but **nothing imports it** (lockout is in Postgres, rate limiting is in-memory).

### `main.py`
Title "MSMEMate", version 0.1.0. Lifespan startup calls `init_classifier()` only — no `create_all()`, no migrations. CORS with credentials + wildcard methods/headers, origins from `CORS_ORIGINS`. Rate-limit middleware registered after CORS. No exception handlers, no GZip, no TrustedHost. Container: `python:3.11-slim`, single uvicorn worker.

### Database — 10 tables (`database.py`), Supabase Mumbai
`ondc_domains` · `ondc_categories` · `users` (role enum mse/admin, lockout columns) · `mses` (full TEAM-form: udyam, entrepreneur, email, address, org_type, major_activity, transaction_type, PAN/GST, turnover_prev_fy, ondc_awareness, wish_snp, **consent_given + consent_at**, review + allocation columns) · `snps` · `classification_results` · `match_results` (sub-scores + confidence_band + explainer_en/hi) · `audit_logs` · `snp_claims` (claim_ref, type, channel, sku_count, claimed_amount, source, status, decision columns).
4 native Postgres enums: `user_role`, `turnover_band`, `support_level`, `confidence_band`. Pool: `pool_pre_ping`, size 5, overflow 10, recycle 300. RLS deny-all on every table (backend owner connection bypasses).
**Undeclared table:** `geo_districts` is queried by raw SQL in `routes/mse.py` and created by `scripts/geocode_districts.py`; the query is try/except-wrapped so a missing table degrades to state-level bubbles.

### Shipped API artifacts
`data/category_demand.json` (AIKosh orders: 129,591 mapped / 45,137 unmapped) · `data/district_msme.json` (788 districts, official Udyam counts) · `data/snp_capacity.json` (synthetic-disclosed) · `data/vargbot_baseline_eval.json` (v2, stage `production`) · `data/vargbot_v1_eval.json` (stage `archived`) · `models/vargbot_tfidf_v1.joblib` (4.1 MB) · `models/vargbot_tfidf_v2.joblib` (15.8 MB, **the served default**).

### Claims Copilot rule engine (`routes/claims.py`)
Rates: onboarding ₹450 · SKU B2C ₹50 (cap 50) · SKU B2B ₹125 (cap 20) · catalogue cap ₹2,500. Seven rule checks (`udyam_valid`, `micro_small`, `activity`, `one_snp`, `catalogue_live`, `sku_cap`, `amount`). Risk = failed×0.22 + anomalies×0.12, capped 1.0; bands green <0.2, yellow <0.55, red above. Queue is honestly stamped `simulated-claims-demo` pending the real TEAM portal claims feed.

## ML & MLOps — `ml/`, `scripts/`, `data/`, `dvc.yaml`

### Training / eval scripts
`ml/train_vargbot_tfidf.py` (v1) · `ml/train_vargbot_tfidf_v2.py` (v2, word+char FeatureUnion) · `ml/pipelines/train_vargbot.py` (MuRIL+LoRA, research) · `ml/pipelines/match_engine.py` (IndicBERT, research) · `ml/evaluation/` (`metrics.py`, `baseline.py`, `evaluate_vargbot.py`, `eval_vargbot_live.py`, `eval_jodakai_ranking.py`) · `ml/tests/smoke_test_vargbot.py` (CI behavioural gate).

### Evidence (real numbers — quote these, never round up)
| Report | Key metrics |
|--------|-------------|
| `vargbot_tfidf_v2_eval.json` | 14/14 domains, n_test 3,353, C=2.0. **CV-5 macro-F1 0.9841 ± 0.0010**; test acc **0.9893** / macro-F1 **0.9866**. Per source: flipkart 0.9808 · mepma 0.995 · mse_profile 1.0 · synthetic 1.0. **Real-products-only: n=2,466, acc 0.9854, macro-F1 0.9575 ← the honest headline.** Carries a `honesty_note` that template twins make the synthetic subsets optimistic. Gate calibration table 0.3→0.9; `recommended_gate_p95` 0.3. |
| `vargbot_tfidf_eval.json` (v1) | 8 domains, n_test 1,966. CV 0.9459 ± 0.0098; test acc 0.9863 / macro-F1 0.9612. |
| `vargbot_domain_eval.json` | **Live Sarvam-30B zero-shot, before the trained model**: n=320, acc **0.397**, macro-F1 0.354 (RET17 and RET1B scored 0.0). This is the "before" evidence — a different system from the TF-IDF number above. |
| `jodakai_ranking_eval.json` | 281 SNPs × 189 queries, heuristic relevance 0-3 (expert labels pending). rating-only NDCG@3 0.425 → heuristic-v1 0.659 → **multifactor-v2 0.879**; MRR 0.099 → 0.570 → **0.681**; Recall@5 0.090 → 0.526 → **0.718**. |
| `vargbot_robustness_eval.json` (2026-08-09) | Evaluates the **shipped artifact** (never retrains); split reproduced from the same SEED. Covers the Annexure-II metrics the primary report lacked: **AUC-ROC macro-OVR 0.9996**, log loss **0.0865**, balanced accuracy **0.9888**; latency **p50 2.06 ms / p95 2.96 ms**, ~2,920 items/s batched; cost-per-inference model (compute rate is a stated assumption, and the Sarvam leaf call is excluded). Plus a 5-family model comparison. **OPEN FINDING: LogisticRegression 0.9824 is not the best probability-capable family — SGD(modified_huber) scores 0.9880.** Not acted on: modified_huber probabilities are poorly calibrated and the gate, the bands and the drift alerts are all calibration-dependent, so a swap needs gate re-calibration first. |

### Data
`data/processed/`: `training_corpus_v2.csv` (33,530 lines, 8.35 MB, 4 sources) · `product_category_pairs.csv` (19,654) · `mepma_product_pairs.csv` (9,072) · `mse_profiles_5k.csv` (5,001 + `.meta.json` provenance, gender split M 3,824 / F 1,176) · `snp_profiles.csv`/`.json` (281) · `snp_transaction_history.csv` (54) · `ondc_taxonomy.json` (285 KB).
`data/raw/`: Flipkart 20K, AIKosh Udyog Aadhaar 100K sample + district-wise Udyam counts + ONDC order xlsx, ONDC `livenetwork_v91.json` + protocol-network-extension clone. Large raw CSV/PDF are gitignored via `data/.gitignore`; `SOURCE.md` provenance files are kept.

### Build scripts (`scripts/`)
`build_ondc_taxonomy.py` · `build_product_category_pairs.py` · `build_snp_profiles.py` · `build_mepma_artifacts.py` · `build_mse_profiles.py` · `build_training_corpus_v2.py` · `build_demand_index.py` · `geocode_districts.py` (OSM Nominatim, 1 req/s, idempotent) · `seed_real_data.py` (Supabase REST, idempotent).

### DVC pipeline (`dvc.yaml`, all outs `cache: false` — deploy ships from git)
`build_corpus` → `train` (metric: `ml/reports/vargbot_tfidf_v2_eval.json`) → `deploy_artifact` (copies model + report into `apps/api/`) → `smoke_test`.

### CI — `.github/workflows/ci.yml` (push + PR to main)
Job **api**: Python 3.12, install, `compileall`, `import main` with dummy env, then **`python ml/tests/smoke_test_vargbot.py`** (fails the build on missing artifact, lost domain coverage, or regression on canonical EN + Hinglish cases).
Job **web**: Node 20, `npm ci`, `tsc --noEmit`, `npm run build`.
No lint, no DVC-repro, no deploy workflow.

### Docs & notebooks
`docs/MODEL_CARD_VARGBOT.md` · `docs/STRATEGY.md` · `docs/DPDP.md` · `docs/AgentMapAI_PRD_v2.docx` · `docs/PRESENTATION_SCRIPT.md` (**gitignored, local-only**).
`notebooks/vargbot_playground.ipynb` — 16 cells, reproduces v2 end-to-end on Colab CPU from the public GitHub raw corpus. **NSIC-only link** (surfaced in the model-registry card); deliberately never linked from public pages.

---

## Development Phases & Module Tracking

### Phase 1: Stage 1 PoC — status as of 2026-07-20

**Week 1–2: Data & Baseline** — ✅ complete
- [x] Ingest training data (AIKosh + Flipkart + MEPMA + ONDC registry)
- [x] Clean ONDC taxonomy — 14 domains / 392 leaves (not 3-5; full taxonomy)
- [x] SNP dataset — **281 real registry SNPs** (the synthetic 50 were deleted)
- [x] MSE dataset — **5,020 real-derived profiles** (5K target met)
- [x] Rule-based baseline classifier + matcher
- [x] Baseline metrics computed and persisted

**Week 3–4: Module 2 — VargBot** — ✅ shipped (TF-IDF, not MuRIL)
- [x] Trained domain classifier in serving, 14/14 domains
- [x] Stratified 80/10/10 + 5-fold CV
- [x] Accuracy, per-domain F1, per-source breakdown, gate calibration
- [x] Model card (`docs/MODEL_CARD_VARGBOT.md`)
- [ ] MuRIL fine-tune (needs GPU; pipeline written, never run) — Stage 2
- [ ] Leaf-level (category) accuracy evaluation — currently domain-level only

**Week 5: Module 3 — JodakAI** — ✅ shipped (heuristic, not embeddings)
- [x] Multi-factor scoring v2 in production
- [x] NDCG@3 / MRR / Recall@5 evaluated vs two baselines
- [ ] IndicBERT embedding similarity (pipeline written, never run) — Stage 2
- [ ] Grid-search weight optimisation
- [ ] Expert relevance labels from the NSIC queue (current labels are heuristic)

**Week 6: Frontend & Integration** — ✅ complete
- [x] Landing page + full marketing site (blog, legal, trust, 24 city pages)
- [x] Sathi registration on the TEAM-form schema
- [x] Match explanation with qualitative bands
- [x] Confidence band visualisation
- [x] NSIC review queue, allocation, audit trail
- [x] Model Health dashboard + model registry
- [x] All modules integrated end-to-end and verified live

**Week 7: Submission**
- [x] Architecture + explainer diagrams (`BlogDiagram`)
- [x] Evaluation evidence persisted (`ml/reports/`)
- [ ] 2-3 minute demo video (notes below)
- [ ] Final testing & polish
- [ ] Submission package

## Deployment

- **Frontend:** Vercel, project `msmseagentmap56`, rootDirectory `apps/web`. **Git push to main = auto-deploy.** Manual only if needed: `npx vercel deploy --prod --yes` from repo root.
- **API:** Azure App Service `agentmap-api`, Python 3.11 runtime. Deploy with `git archive -o zip HEAD:apps/api` then `az webapp deploy`. **NEVER `Compress-Archive`** — backslash zip entries break Linux.
- **DB:** Supabase Mumbai `qiigylrybzdxkeibsfvh` (ap-south-1, DPDP residency), session pooler port 5432.
- **Demo logins:** mse@msmemate.com / bharat123 · nsic@msmemate.com / nsic123
- **PS 5.1 gotcha:** no double quotes inside commit-message here-strings. Test Indic scripts via Python UTF-8, not curl.
- **Compliance:** DPDP Act 2023, Indian data residency, RBAC, encryption at rest + transit.

---

## Decisions made (do not relitigate)

- **Commits:** NO Claude/Anthropic attribution lines — the work is team-authored.
- **Name:** MSMEMate. Azure resources keep `agentmap-*`; localStorage key stays `agentmap_session`.
- **Database = Supabase Mumbai.** Neon is REMOVED from the stack entirely (2026-07-07).
- **Auth:** custom JWT, not Supabase Auth — zero extra cost, exact control over lockout. Redis optional (lockout is DB-backed).
- **PS2 flow:** registration is PUBLIC (voice-first entry, rate-limited); classify + match are logged-in steps.
- **Fallback engines:** Sarvam primary (paid) + neutral-named secondaries for demo reliability; never fake a Sarvam label on fallback output.
- **Colab notebook:** repo is public, but the notebook stays unadvertised — NSIC-only link (2026-07-12).
- **Always consult the user before changing anything.**

## HOW TO USE the shipped features

- **Model Health**: login `nsic@msmemate.com` → Oversight → Model Health (`/model-health`). Top card = MLflow-style registry (serving engine read live from the loaded artifact, v2-production vs v1-archived table, Colab link); below it drift signals (weekly confidence trend avg+p25, engine-mix drift, officer override meters, per-domain vs the frozen baseline). Red banner = retrain recommended. Thresholds env-tunable: `MONITOR_FALLBACK_ALERT` (0.20), `MONITOR_OVERRIDE_ALERT` (0.10), `MONITOR_LOW_CONF` (0.60).
- **Retrain cycle** (repo root): `python scripts/build_training_corpus_v2.py` → `python ml/train_vargbot_tfidf_v2.py` → copy artifact + eval into `apps/api` — or just `dvc repro` (`dvc metrics show` prints the eval). Engine stamp auto-derives from the artifact filename (`vargbot_tfidf_v3.joblib` → `vargbot-tfidf-v3`). Ship the new eval as `apps/api/data/vargbot_baseline_eval.json` and keep the old one as `vargbot_vN_eval.json` so the registry history grows.
- **Officer-feedback flywheel**: `GET /model-health/feedback-export` (admin JWT) → weak-supervision rows (the response carries an explicit `label_semantics` disclaimer). Merge into the corpus as `source=officer_feedback`, deduped by `mse_id`.
- **CI model gate**: `ml/tests/smoke_test_vargbot.py` runs on every push — update its canonical cases when retraining changes expected behaviour.
- **Rollback**: set `VARGBOT_TFIDF_PATH` to the v1 artifact; tune the gate via `VARGBOT_TFIDF_MIN_CONF` (default 0.55; calibration table in the eval JSON).
- **Claims Copilot**: `/claims` (admin) — rule checks + risk band per claim, officer decides. Queue is honestly stamped `simulated-claims-demo`.
- **Catalogue Studio**: `/catalogue` — download the domain XLSX template, upload a filled sheet, rows are auto-categorised and emitted as a Beckn `on_search` payload. 8 domains supported (RET10-16, RET18).
- **Blog diagrams**: add `diagram: { id, caption }` to any `BlogSection`; ids live in `components/BlogDiagram.tsx` (`ondc-vs-marketplace`, `vargbot-chain`, `claims-flow`, `mlops-loop`).
- **City pages**: add a `CityCluster` to `lib/cities.ts` — the route, sitemap entry and JSON-LD follow automatically. Keep entries factual; these are not doorway pages.

## Key environment variables

`DATABASE_URL` (required — RuntimeError at import if unset) · `JWT_SECRET` (CRITICAL log + insecure dev fallback if unset) · `JWT_TTL_MIN` 720 · `MAX_LOGIN_ATTEMPTS` 5 · `LOCKOUT_MINUTES` 15 · `CORS_ORIGINS` · `RATE_LIMIT_LOGIN` 10 · `RATE_LIMIT_LLM` 60 · `RATE_LIMIT_DEFAULT` 120 · `SARVAM_API_KEY` · `SARVAM_CHAT_MODEL` sarvam-30b · `VARGBOT_TFIDF_PATH` · `VARGBOT_TFIDF_MIN_CONF` 0.55 · `VARGBOT_MODEL_DIR` · `USE_MOCK_STT/OCR/TTS` · `STT_FALLBACK_KEY/REGION` · `OCR_FALLBACK_KEY/ENDPOINT` · `DOCINT_TIMEOUT_S` 120 · `MONITOR_FALLBACK_ALERT/OVERRIDE_ALERT/LOW_CONF` · `REDIS_URL` (optional, unused).
`GEMINI_API_KEY`, `NVIDIA_API_KEY`, `AIKOSH_API_KEY` sit in `.env` but are **read by nothing** under `apps/api` — leftovers from the pre-sovereign era.

## VIDEO DEMO NOTES (2-3 min)

1. **Open**: landing hero rotation (desktop + phone) → voice registration in Hinglish → classification showing the honest `vargbot-tfidf-v2` stamp.
2. **The ML story**: Model Health registry card — v1 (8 domains, CV 0.946) → v2 (14 domains, CV 0.984). Say the honest number out loud: **real-products-only 98.5% / 0.957**.
3. **The lifecycle story** (the differentiator): drift monitor → red-alert thresholds → feedback export → retrain → CI gate. Line: *"the loop, not any single model, is the product."* B-roll: `mlops-loop` + `vargbot-chain` diagrams, Colab notebook training live.
4. **Close**: officer approves in the review queue → audit trail → *"humans stay the authority."*
   Script format precedent: `docs/PRESENTATION_SCRIPT.md` (gitignored).

---

## Open items (ranked)

1. **🔴 TRADE-SECRET — the weights are still public, in the source of truth itself.** `README.md` and `ml/pipelines/match_engine.py` were redacted on 2026-08-09, **but `apps/api/services/matcher.py` carries the identical live weight constants and this repo is confirmed PUBLIC** (`gh repo view` → PUBLIC). The CONFIDENTIALITY rule's claim that the formula "lives server-side only" does not hold while server-side code is world-readable. Redacting the docs alone was hygiene, not a fix. **Needs a user decision:** (a) make the repo private — also satisfies the Stage-2 source-code-sharing terms, which are private disclosures to IndiaAI; (b) move the weights to env/secret config; or (c) accept the disclosure and drop the trade-secret claim.
2. ~~`apps/api/.env` committed with live secrets~~ — **VERIFIED FALSE 2026-08-09.** `.env` is untracked, matched by `.gitignore:14`, and no `.env` path was ever added in any branch's history. The only committed env file is `apps/web/.env.production`, which contains one public API URL. Secret-shaped strings in `.github/workflows/ci.yml` (`ci:ci@localhost`, `ci-only-secret`) and `.claude/settings.local.json` (`u:p@localhost`, `JWT_SECRET=dummy`) are all dummies. No history purge is needed.
3. **Azure plan downgrade — DO NOT DO THIS.** Superseded 2026-08-08: the plan was deliberately upgraded B1→S1 with autoscale (min 1 / max 3) and a `/health` check. This entry is retained only to stop the old F1 downgrade being re-attempted.
4. Human microphone test of the live voice flow (the only thing automation cannot drive).
5. `/upload` is a mock-only page — either wire it to `/catalogue/upload` or remove it from the sidebar.
6. `robots.ts` does not disallow `/claims` or `/model-health` although both are admin-gated — crawlable shells.
7. ~1,700 lines of orphaned components (see the frontend inventory) — delete or revive deliberately.

## Known inconsistencies in the code (documented, not yet fixed)

- `classifier.py` probes for `vargbot_tfidf_v1.joblib` when building its startup log line while `init_classifier()` loads **v2** — the advertised chain string can disagree with the served stamp. The module docstring also still describes v1.
- `MONITOR_LOW_CONF` defaults to 0.60 with a comment saying it mirrors `VARGBOT_TFIDF_MIN_CONF`, whose default is **0.55**.
- The v2 eval recommends `recommended_gate_p95: 0.3`; production runs the gate at **0.55** and the notebook narrates 0.55. The choice is defensible (precision over coverage) but is nowhere written down.
- `classification_results.model_version` still defaults to `"muril-v1-lora"` and `match_results.model_version` to `"indicbert-v1"` in the ORM. Every write path overrides them, so no live row is mis-stamped — but the defaults are dishonest if a path ever forgets.
- `apps/api/ml/` is an empty directory; a comment in `classifier.py` references `ml/reports/vargbot_tfidf_v2_eval.json` at that path.
- `infra/init.sql` is the obsolete 5-domain / 50-SNP PoC seed, superseded by `scripts/seed_real_data.py`. It is wired into no compose service.

## Remaining feature tasks (not started)

Elasticsearch search · AI chat panel (RAG, sovereign) · ONDC integration + visibility nudges (seller-app SDK handoff; catalog + serviceability nudges) · i18n framework (copy is currently hardcoded) · offline polish.

## Known honest gaps (Stage-2 narrative)

- Matching is **deterministic heuristic scoring**, not learned ranking — no IndicBERT embeddings in the path, and ranking relevance labels are heuristic pending expert NSIC labels.
- Classification is **TF-IDF + LLM leaf resolution**, not a MuRIL fine-tune. The MuRIL pipeline exists but has never been run (no GPU) and cannot execute in the shipped image.
- Leaf-level (category) accuracy is **still unmeasured** — all published evidence is domain-level. The *capture* path now exists (`POST /classify/{id}/verify` → `classification_results.officer_category`, surfaced via `/model-health/feedback-export` as `label_strength: "gold"`), but no labels have been collected yet, and there is **no officer-facing UI to enter a correction** — the endpoint is API-only. Measurement follows collection.
- SNP capacity / onboarding-speed data is synthetic-disclosed, pending TEAM-portal integration; the claims queue is a simulated demo feed for the same reason.
- Rate limiting is per-worker in-memory; `/stt` `/ocr` `/tts` `/ner` are fully public and spend paid Sarvam quota under IP limits only.
- No DB backups, no migration tooling (no Alembic; `main.py` does not even `create_all()`).
