# AgentMap AI — Stage-1 Winning Strategy (v2 Architecture)

*Drafted 2026-07-07. Internal — do not publish. Weights/formula remain trade secret.*

## 0. The gate we must pass

Stage-1 submission closed 02.03.2026. What remains is **PoC verification and shortlisting**
(challenge doc: "shortlisted teams may be required to provide working PoCs, test access
details, source code and documentation"). Up to 3 teams advance per problem statement.
Everything below optimizes for that review: a working system + verifiable evaluation
evidence mapped line-by-line to Annexure II.

**Positioning sentence (use everywhere):** *"The Ministry's own AIKosh data shows the
problem — 935 of 9,071 real SHG products uncategorized, the rest tagged inconsistently
('Jewellary', 'Floor cleners'). AgentMap fixes registration, categorisation and SNP
matching with sovereign AI, evaluated on real ONDC data."*

## 1. Model stack (v2 — supersedes v1 table where noted)

| Component | v2 Choice | Why (evidence) | Fallback |
|---|---|---|---|
| STT | **Sarvam Saaras V3** (₹30/hr, streaming, 22 langs) | 19.31% WER IndicVoices — beats GPT-4o-Transcribe/Gemini | Bhashini ASR / IndicConformer self-host |
| TTS | **Sarvam Bulbul V3** (₹30/10K chars) | 35+ voices, streaming, 11 langs | Bulbul V2 (cheaper) |
| OCR | **Sarvam Vision 3B** (₹0.5/page) — *replace mock* | 84.3% olmOCR-Bench > Gemini 3 Pro; trained on Indian govt forms | Surya OCR (self-host) |
| LLM (NER/explain/augment) | **Sarvam-30B** (Apache 2.0!, ₹2.5/₹10 per 1M tok) — *migrate off deprecated sarvam-m* | MoE 32B/2.4B active, SOTA 22 Indian langs, open weights = self-host escape hatch | Sarvam-105B (hard cases); Param-2-17B (2nd sovereign vendor) |
| Classification (VargBot) | **MuRIL-base + LoRA** (unchanged) | Published Hinglish F1 wins; single-T4 trainable | **IndicBERT-v3-270M as challenger run** (rubric wants "variety of models") |
| Embeddings (JodakAI) | **Krutrim Vyakyarth** (768-dim, sentence-transformers) — *supersedes raw IndicBERTv2* | Flores retrieval: Hindi 99.9% vs MuRIL 84.2%; raw IndicBERTv2 is not a sentence embedder | BGE-M3 / mE5-large self-host (MIT) |
| Ranking (JodakAI P2) | **XGBoost LambdaMART** (`rank:ndcg`) | Canonical hand-weights→GBDT-LTR maturation path (Airbnb) | keep weighted scorer |
| Explainability | **SHAP TreeExplainer → top-3 factors → bilingual templates** (cite RankSHAP/RankingSHAP) | Exact for GBDT; exposes qualitative labels, never weights | template-only |

**Ruled out with evidence:** Azure AI Foundry serverless (Llama/Mistral run only in
US/Sweden — no India residency; managed-compute GPU VMs in Central India remain a
Stage-2 self-host option). Gemini/NVIDIA chains: removed (sovereignty).
**TOON format:** adopt only for uniform arrays fed to the LLM (e.g., SNP candidate
tables in explanation prompts, ~40% token savings); plain compact JSON everywhere else.

## 2. Architecture per module (with the data each part consumes)

### Sathi — voice registration (user-friendly first)
Streaming Saaras V3 → **incremental slot-filling**: per-turn extraction merged into a
persistent 27-field TEAM-form state (fields grouped into 5 sub-schemas: identity,
location, business, products, documents). Extraction = **reason-then-constrain**
(free-text normalization pass, then JSON-schema-constrained final emit — CRANE pattern;
naive whole-output constraining costs ~12 F1 points on noisy Hinglish transcripts).
Pydantic validation + one retry; formatted IDs (Udyam/PAN/PIN) go through regex +
spoken confirmation. Sarvam Vision OCR auto-fills from the Udyam certificate.
Only missing/low-confidence slots are re-asked. Hindi default, 8 languages honest.
*Data: TEAM 27-field schema (research pack), real Udyam formats from the MH 100K units.*

### VargBot — categorisation
**Flat 392-leaf MuRIL+LoRA classifier with auxiliary 14-domain head** (multi-task).
Level-wise cascades rejected: error propagation + data fragmentation (Amazon/HTC
literature; our tree is shallow). Hierarchy-consistency check (leaf ∈ domain?) feeds
review routing. **Calibration: temperature scaling** on held-out; Green/Yellow/Red =
two tuned thresholds on calibrated confidence + consistency flag. Tail leaves below
~30-50 examples get Sarvam-30B synthetic augmentation (documented as synthetic).
Low-confidence tail at inference → retrieve-then-classify fallback (Vyakyarth top-k
leaves → Sarvam-30B chooses). Also emits NIC + HSN codes via taxonomy crosswalk.
*Data: 19,653 Flipkart pairs + 9,071 MEPMA real SHG pairs (+935 MISSING as demo set)
+ 5K MSE descriptions; ondc_taxonomy.json as label space.*
**Honest targets: leaf micro-F1 70–80%, top-3 leaf 88–93%, domain accuracy 92–96%.**
Report hierarchical + top-3 metrics; never promise >90% leaf.

### JodakAI — matching
No retrieval cascade (281 candidates — score them all). **Feature vector per (MSE, SNP):**
Vyakyarth cosine (MSE description ↔ SNP domain profile), geo/serviceability overlap,
commission, language overlap, onboarding support, **real transaction-history features**
(orders, value, cities from WowGeni aggregates — as ratios, Bayesian-smoothed toward
global prior; new-SNP exploration boost for cold start), capacity ratio (synthetic,
disclosed, Stage-2 TEAM integration). **Phase 1 (now):** weighted scorer = transparent
baseline. **Phase 2 (before review):** XGBoost LambdaMART trained on ~200-500
expert-labeled queries (graded 0-3) + reassignment simulation; +5-15% NDCG expected.
**Labels accrue from the NSIC review queue** — build approve/reject/reassign now.
Eval: NDCG@3 + MRR + Recall@k, per-query logs committed.
*Data: 281 real SNPs, snp_transaction_history.csv (137K real order lines), 5K MSEs.*

### Explanation layer
SHAP top-3 factors → bilingual (EN/HI) templated sentences; Sarvam-30B narrative
polish with TOON-encoded factor tables. Qualitative labels only — never weights.

### Data layer
Supabase Postgres (Mumbai, ap-south-1) + **pgvector** (281 precomputed Vyakyarth SNP
embeddings; MSE embedded at request time, CPU ~100-300ms). Upstash Redis cache.
Indian data residency satisfied at Stage-1; Stage-2: Indian cloud (Yotta/E2E) +
self-hosted Sarvam-30B (Apache 2.0 makes the sovereign story airtight).

## 3. Annexure II rubric — line-by-line evidence plan

| Rubric item | Our evidence artifact |
|---|---|
| Data exploration/cleaning | data/README.md + notebook: distributions, dedup, noise examples (MEPMA typos) |
| Skewness mitigation | RET12 = 60% of Flipkart pairs → class-balanced sampling + tail augmentation, before/after chart |
| Stratified train-test split | 80/10/10 stratified by leaf, split manifest committed |
| Data governance | provenance table (licenses: GODL-India, CC BY-SA), DPDP mapping, synthetic-field disclosure |
| Cross-validation | 5-fold CV on MuRIL LoRA, mean±std reported |
| Hyperparameter tuning | LR × LoRA-rank grid (existing gap — must build), tuning table |
| Variety of models | keyword baseline vs MuRIL vs IndicBERT-v3-270M (3-way comparison) |
| Accuracy/P/R/F1/AUC-ROC/confusion | per-domain confusion matrix, macro/micro F1, OvR AUC — ml/reports/*.json + charts |
| Inference latency | measured p50/p95 per endpoint (middleware), T4 + CPU |
| Cost per inference | ₹ table from Sarvam price sheet: per registration / classification / match |
| Model monitoring strategy | calibration drift check + review-queue disagreement rate (write 1-pager) |
| Responsible AI | fairness slices by gender & social category (real fields in our data!), audit log, human-in-loop review queue |

## 4. Sprint plan (lean, ~3 weeks)

- **Sprint 0 (D1-2) — Integrity & migration:** P0 fixes (weights off UI, vendor badges
  off, false model_version labels, key rotation + history purge, hide fake /upload);
  migrate sarvam-m → sarvam-30b; Sarvam-first chains, non-sovereign fallbacks OFF;
  enable real OCR (Sarvam Vision) + TTS (Bulbul V3, fix version string).
- **Sprint 1 (D3-7) — VargBot for real:** unified training set (Flipkart+MEPMA+MSE),
  tail augmentation, MuRIL LoRA on T4, temp scaling, 5-fold CV + HP grid,
  IndicBERT-v3 challenger, eval reports to ml/reports/, wire adapter into API
  (MuRIL primary, LLM fallback — inverts today's architecture into the claimed one).
  Demo moment: classify the 935 uncategorized MEPMA products live.
- **Sprint 2 (D8-11) — JodakAI for real:** pgvector + Vyakyarth embeddings, real
  transaction features, expert-label ~200 queries (team labels via review UI),
  weighted baseline vs LambdaMART, SHAP explanations, NDCG@3/MRR report + baseline-vs-AI chart.
- **Sprint 3 (D12-14) — Sathi v2:** slot-filling state machine, reason-then-constrain
  extraction, OCR live in flow, streaming STT, latency middleware.
- **Sprint 4 (D15-17) — Product surface:** review queue with real approve/reject/reassign
  (label collection!), admin dashboard (aggregate metrics, fairness slices, cost/latency),
  fix dead links/claims ("8 languages", real stats from our data).
- **Sprint 5 (D18-21) — Evidence pack:** Model Evaluation Document, Ranking Evaluation
  Report, architecture diagram, TRL statement (TRL 5-6 honest), 2-3 min demo video
  (script: pain point → voice reg in Hindi → live classification of Ministry's own
  uncategorized data → explained top-3 SNPs → NSIC dashboard), security checklist.

## 5. Risks & honest lines

- Never claim MuRIL/IndicBERT run until they actually do (Sprint 1 exit criterion).
- Capacity data is synthetic — say so, frame TEAM-portal integration as Stage-2 plan.
- Gender skew in real data (23.5% F) reported transparently vs TEAM 50% target.
- Krutrim Community License: review commercial terms before Stage-2; BGE-M3 is the MIT fallback.
- Sarvam free credits ₹1,000 → budget; costs are pennies at PoC scale (table in evidence pack).
