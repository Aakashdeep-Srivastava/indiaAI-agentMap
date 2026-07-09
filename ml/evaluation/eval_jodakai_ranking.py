# -*- coding: utf-8 -*-
"""JodakAI ranking evaluation — NDCG@3, MRR, Recall@5.

Compares three rankers over real data (281 registry SNPs × sampled MSE
queries from the 5K real-derived profiles):

  1. rating-only          — naive floor: SNPs sorted by rating
  2. heuristic-v1         — the previous production scorer (frozen copy,
                            including its registry-data blind spots:
                            no RET-MULTI handling, "pan-india" spelling only,
                            comma-only language lists)
  3. multifactor-v2       — the live production scorer imported from
                            apps/api/services/matcher.py

Relevance judgments are HEURISTIC pending expert labels from the NSIC
review queue (see docs/STRATEGY.md): graded 0-3 from domain coverage
(exact=2, multi-category=1) + geographic serviceability (state/district=1,
pan-India=0.5). Commission/rating/support deliberately do NOT enter the
relevance grade, so the eval measures whether each scorer surfaces
serviceable, domain-relevant SNPs — not whether it agrees with itself.

Writes ml/reports/jodakai_ranking_eval.json (summary + per-query logs).

Run: python ml/evaluation/eval_jodakai_ranking.py
"""

import csv
import json
import math
import random
import re
import sys
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from services.matcher import compute_match_scores  # noqa: E402  (the LIVE v2 scorer)

SEED = 20260710
N_QUERIES = 200
TOP_K = 5
random.seed(SEED)

# ── Load 281 real registry SNPs ────────────────────────────────────────
snps = []
with open(ROOT / "data" / "processed" / "snp_profiles.csv", encoding="utf-8", newline="") as f:
    for i, row in enumerate(csv.DictReader(f), 1):
        snps.append(SimpleNamespace(
            id=i,
            subscriber_id=row["snp_id"].strip(),
            name=row["name"].strip(),
            domain_codes=(row.get("domain_codes") or "").strip(),
            geo_coverage=(row.get("geo_coverage") or "").strip(),
            commission_pct=float(row.get("commission_pct") or 0),
            rating=float(row.get("rating") or 0),
            onboarding_support=(row.get("onboarding_support") or "none").strip(),
            languages_supported=(row.get("languages_supported") or "").replace("|", ","),
        ))

# ── Sample MSE queries, stratified by domain ──────────────────────────
by_domain = defaultdict(list)
with open(ROOT / "data" / "processed" / "mse_profiles_5k.csv", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        dom = (row.get("ondc_domain") or "").strip()
        if dom:
            by_domain[dom].append(row)

per_domain = max(1, N_QUERIES // len(by_domain))
queries = []
for dom, rows in sorted(by_domain.items()):
    random.shuffle(rows)
    queries.extend(rows[:per_domain])
random.shuffle(queries)
queries = queries[:N_QUERIES]
print(f"SNPs: {len(snps)} | queries: {len(queries)} across {len(by_domain)} domains (seed {SEED})")


def mse_obj(row):
    return SimpleNamespace(
        state=(row.get("state") or "").strip(),
        district=(row.get("district") or "").strip(),
        language=(row.get("language") or "en").strip(),
    )


# ── Heuristic graded relevance (0-3) — independent of scorer weights ──
_MULTI = {"ret-multi", "multi", "all"}
_PAN = re.compile(r"\bpan[\s-]?india\b|\ball[\s-]?india\b|\bnational\b|\ball\b")


def relevance(mse_row, snp) -> float:
    dom = (mse_row.get("ondc_domain") or "").strip().lower()
    codes = {d.strip().lower() for d in re.split(r"[,|]", snp.domain_codes) if d.strip()}
    dom_gain = 2.0 if dom in codes else (1.0 if codes & _MULTI else 0.0)

    cov = snp.geo_coverage.lower()
    state = (mse_row.get("state") or "").strip().lower()
    district = (mse_row.get("district") or "").strip().lower()
    if (district and district in cov) or (state and state in cov):
        geo_gain = 1.0
    elif _PAN.search(cov) or not cov:
        geo_gain = 0.5
    else:
        geo_gain = 0.0
    return dom_gain + geo_gain


# ── Frozen copy of the v1 heuristic scorer (pre-session production) ───
def v1_scores(mse, all_snps, predicted_domain):
    out = []
    for snp in all_snps:
        if not predicted_domain or not snp.domain_codes:
            d = 0.0
        else:
            d = 1.0 if predicted_domain in [x.strip() for x in snp.domain_codes.split(",")] else 0.2
        cov = snp.geo_coverage.lower()
        if not cov:
            g = 0.3
        elif mse.district and mse.district.lower() in cov:
            g = 1.0
        elif mse.state and mse.state.lower() in cov:
            g = 0.6
        elif "all" in cov or "pan-india" in cov:
            g = 0.4
        else:
            g = 0.2
        c = 1.0 if snp.commission_pct <= 0 else 0.0 if snp.commission_pct >= 15 else 1 - snp.commission_pct / 15
        h = min(max(snp.rating / 5.0, 0.0), 1.0)
        support = {"full": 1.0, "partial": 0.5, "none": 0.1}.get(snp.onboarding_support, 0.1)
        langs = [x.strip().lower() for x in snp.languages_supported.split(",")] if snp.languages_supported else []
        lang = (1.0 if mse.language.lower() in langs else 0.3) if langs and mse.language else 0.5
        s = 0.6 * support + 0.4 * lang
        out.append({"snp": snp, "composite": 0.35 * d + 0.20 * g + 0.15 * c + 0.20 * h + 0.10 * s})
    return out


# ── Metrics ────────────────────────────────────────────────────────────
def ndcg_at_k(rels_ranked, all_rels, k=3):
    dcg = sum(r / math.log2(i + 2) for i, r in enumerate(rels_ranked[:k]))
    ideal = sorted(all_rels, reverse=True)[:k]
    idcg = sum(r / math.log2(i + 2) for i, r in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0


def evaluate(ranker_name, rank_fn):
    ndcgs, rrs, recalls, per_query = [], [], [], []
    for row in queries:
        mse = mse_obj(row)
        ranked_snps = rank_fn(mse, row)
        rels_by_id = {s.id: relevance(row, s) for s in snps}
        rels_ranked = [rels_by_id[s.id] for s in ranked_snps]
        all_rels = list(rels_by_id.values())

        ndcgs.append(ndcg_at_k(rels_ranked, all_rels, k=3))
        rr = next((1.0 / (i + 1) for i, r in enumerate(rels_ranked) if r >= 2.0), 0.0)
        rrs.append(rr)
        relevant = {sid for sid, r in rels_by_id.items() if r >= 2.0}
        top_ids = {s.id for s in ranked_snps[:TOP_K]}
        recalls.append(len(relevant & top_ids) / min(TOP_K, len(relevant)) if relevant else 1.0)

        per_query.append({
            "mse_id": row.get("mse_id"),
            "domain": row.get("ondc_domain"),
            "state": row.get("state"),
            "top5": [{"snp": s.subscriber_id, "rel": rels_by_id[s.id]} for s in ranked_snps[:TOP_K]],
        })
    n = len(queries)
    summary = {
        "ndcg@3": round(sum(ndcgs) / n, 4),
        "mrr": round(sum(rrs) / n, 4),
        f"recall@{TOP_K}": round(sum(recalls) / n, 4),
    }
    print(f"  {ranker_name:16s} NDCG@3={summary['ndcg@3']}  MRR={summary['mrr']}  "
          f"Recall@{TOP_K}={summary[f'recall@{TOP_K}']}")
    return summary, per_query


def rank_rating_only(mse, row):
    return sorted(snps, key=lambda s: s.rating, reverse=True)


def rank_v1(mse, row):
    scored = v1_scores(mse, snps, (row.get("ondc_domain") or "").strip())
    return [x["snp"] for x in sorted(scored, key=lambda x: x["composite"], reverse=True)]


def rank_v2(mse, row):
    scored = compute_match_scores(mse, snps, (row.get("ondc_domain") or "").strip())
    return [x["snp"] for x in sorted(scored, key=lambda x: x["composite"], reverse=True)]


print("\n================ RANKING EVALUATION ================")
results, logs = {}, {}
for name, fn in [("rating-only", rank_rating_only),
                 ("heuristic-v1", rank_v1),
                 ("multifactor-v2", rank_v2)]:
    results[name], logs[name] = evaluate(name, fn)

report = {
    "meta": {
        "evaluated": "2026-07-10",
        "snps": len(snps),
        "queries": len(queries),
        "sampling": f"stratified by ONDC domain from mse_profiles_5k.csv, seed {SEED}",
        "relevance": "HEURISTIC graded 0-3: domain coverage (exact=2, multi=1) + geo "
                     "serviceability (state/district=1, pan-India=0.5). Pending expert "
                     "labels accruing from the NSIC review queue.",
        "rankers": {
            "rating-only": "naive floor — SNPs by rating desc",
            "heuristic-v1": "previous production scorer (frozen copy)",
            "multifactor-v2": "live production scorer (apps/api/services/matcher.py)",
        },
    },
    "results": results,
    "per_query_top5": logs["multifactor-v2"],
}

out = ROOT / "ml" / "reports" / "jodakai_ranking_eval.json"
out.write_text(json.dumps(report, indent=2))
print(f"\nreport → {out.relative_to(ROOT)}")
