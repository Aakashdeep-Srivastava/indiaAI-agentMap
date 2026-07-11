# Model Card — VargBot Domain Classifier v2

**Model:** `vargbot-tfidf-v2` · **Trained:** 2026-07-11 · **Owner:** Team XphoraAI (MSMEMate)
**Task:** Map an MSE's free-text business description (English / Hinglish / code-mixed) to one of the 14 ONDC retail domain codes (RET10–RET1D).

## Architecture

TF-IDF feature union — word n-grams (1–2, 120K features) + character n-grams
(`char_wb` 3–5, 80K features, for Hinglish/transliteration/typo robustness) —
into a class-balanced multinomial Logistic Regression (C=2.0, selected on
validation). Artifact: sklearn Pipeline, 15.8 MB joblib, scikit-learn 1.9.0
pinned identically in training and serving.

## Serving context

The model is the **confidence-gated primary engine** in a chain:

1. `vargbot-tfidf-v2` — if top-1 probability ≥ gate (default **0.55**,
   `VARGBOT_TFIDF_MIN_CONF`), the domain is decided; Sarvam-30B only resolves
   the leaf category + attributes within it (stamp `vargbot-tfidf-v2+sarvam-30b`).
2. Below the gate (Indic-script input, ambiguous text): Sarvam-30B zero-shot
   over the full DB taxonomy (stamp `sarvam-llm`).
3. Last resort: keyword rules (stamp `keyword-fallback`).

Every stored result carries its honest engine stamp — per-prediction lineage.

## Training data (33,529 rows, `data/processed/training_corpus_v2.csv`)

| Source | Rows | Nature |
|---|---|---|
| flipkart | 17,061 | Real product listings (PromptCloudHQ 20K, CC BY-SA 4.0, 2015-16) |
| mepma | 7,613 | Real SHG-seller product names, MEPMA Andhra Pradesh |
| mse_profile | 4,705 | Real-derived MSE profiles (Udyog data) with template-generated Hinglish descriptions |
| synthetic | 4,150 | Template-generated MSE-style text, ONLY for RET15/17/18/19/1C/1D (vocab from ONDC taxonomy leaves + curated lists) |

Builder: `scripts/build_training_corpus_v2.py` (deterministic, seeded,
deduplicated, per-row `source` lineage column). Every domain ≥ 713 rows.

## Evaluation (`ml/reports/vargbot_tfidf_v2_eval.json`)

Protocol: stratified 80/10/10; hyperparameters on validation only; 5-fold CV;
test set touched once.

| Metric | Value |
|---|---|
| 5-fold CV macro-F1 | 0.984 ± 0.001 |
| Held-out accuracy / macro-F1 | 98.9% / 0.987 |
| **Real-products-only (flipkart+mepma)** | **98.5% / 0.957** |
| Weakest domain | RET17 Toys (F1 0.945) |

**Honesty note:** template-generated rows (mse_profile, synthetic) share
near-duplicate templates across train/test, inflating their subset scores to
~100%. The real-products figure is the conservative evidence. Domains
RET15/18/19/1C/1D scoring F1 1.000 are synthetic-backed — treat those numbers
as optimistic until officer-feedback data replaces the synthetic rows.

Gate calibration (validation): 0.55 → 97.6% coverage at 99.3% precision
(same inflation caveat). Full threshold table in the eval JSON.

## Limitations

- **Leaf-category resolution** is delegated to Sarvam-30B and occasionally
  picks a wrong leaf within the correct domain.
- **Indic-script text** is out of distribution by design — it routes to the
  LLM path via the gate; the trained model handles English + romanized Hinglish.
- Six domains rest partly on synthetic data; real-world precision there is
  unproven until live feedback accumulates.
- Flipkart data is 2015-16 vintage — product vocabulary drift is expected and
  monitored (below).

## Monitoring & lifecycle

- **Drift monitoring:** the NSIC Model Health dashboard (`/model-health`)
  tracks weekly confidence trend (avg + p25), engine-mix drift, officer
  override signals, and per-domain live confidence vs this model's frozen
  eval baseline, with red/amber retrain alerts.
- **Feedback flywheel:** `GET /model-health/feedback-export` exports
  officer-reviewed classifications as weak-supervision retraining rows.
- **CI gate:** `ml/tests/smoke_test_vargbot.py` blocks any deploy where the
  shipped artifact loses domain coverage or regresses on canonical inputs.
- **Reproduction:** `dvc repro` (corpus → train → deploy-copy stages in
  `dvc.yaml`), or run the two scripts directly.
- **Rollback:** v1 artifact retained; `VARGBOT_TFIDF_PATH` env switches.

## Ethics & compliance

- Sovereign AI: trained and served entirely on our own infrastructure; the
  only external AI dependency is Sarvam (Indian) for leaf resolution.
- No personal data in the training corpus (product/business text only);
  registration flows are DPDP-compliant with consent + erasure.
- Every production decision is audit-logged and human-reviewable; NSIC
  officers can override any AI output.
- End-users see qualitative bands and plain-language explanations, never raw
  internals.
