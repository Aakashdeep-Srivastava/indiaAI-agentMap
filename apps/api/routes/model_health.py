"""Model Health — VargBot degradation monitor (read-only analytics).

Every classification already stores its confidence, engine stamp and
timestamp (classification_results), and every officer decision is audited
(mses / audit trail). This router aggregates those existing records into
drift signals — no new data collection, no writes. Mounted admin-only.

Signals:
  1. Weekly confidence trend (avg + 25th percentile)
  2. Engine-mix drift (trained model vs Sarvam LLM vs keyword fallback)
  3. Officer override signals (registration rejections, allocation overrides)
  4. Per-domain live confidence vs the frozen training-eval baseline
  5. Threshold alerts (red = retrain recommended)
"""

import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import MSE, ClassificationResult, MatchResult, OndcDomain, get_db

router = APIRouter()

# Alert thresholds (env-tunable)
FALLBACK_ALERT = float(os.getenv("MONITOR_FALLBACK_ALERT", "0.20"))
OVERRIDE_ALERT = float(os.getenv("MONITOR_OVERRIDE_ALERT", "0.10"))
LOW_CONF = float(os.getenv("MONITOR_LOW_CONF", "0.60"))  # mirrors VARGBOT_TFIDF_MIN_CONF

# Frozen offline evaluation of the trained classifier (held-out test set,
# stamped at training time). Live per-domain confidence is compared against it.
_BASELINE_PATH = Path(__file__).resolve().parent.parent / "data" / "vargbot_baseline_eval.json"
try:
    _BASELINE: dict = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
except OSError:
    _BASELINE = {}

ENGINE_FAMILY_LABELS = {
    "trained": "Trained model (VargBot TF-IDF)",
    "llm": "Sarvam-30B zero-shot",
    "fallback": "Keyword fallback",
    "other": "Other engines",
}


def _family(model_version: Optional[str]) -> str:
    v = (model_version or "").lower()
    if v.startswith("vargbot-tfidf"):
        return "trained"
    if v == "sarvam-llm":
        return "llm"
    if v == "keyword-fallback":
        return "fallback"
    return "other"


def _p25(values: list) -> Optional[float]:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[int(0.25 * (len(ordered) - 1))]


@router.get("/")
def model_health(
    weeks: int = Query(default=12, ge=2, le=52),
    db: Session = Depends(get_db),
):
    """Aggregate degradation signals for the NSIC Model Health dashboard."""
    now = datetime.utcnow()
    rows = db.query(
        ClassificationResult.predicted_domain,
        ClassificationResult.confidence,
        ClassificationResult.model_version,
        ClassificationResult.created_at,
    ).all()

    total = len(rows)
    confidences = [r.confidence for r in rows]
    low_conf_share = (
        sum(1 for c in confidences if c < LOW_CONF) / total if total else 0.0
    )

    # ── Engine mix ─────────────────────────────────────────────────────
    family_counts = Counter(_family(r.model_version) for r in rows)
    engine_counts = Counter((r.model_version or "unknown") for r in rows)
    fallback_share = family_counts["fallback"] / total if total else 0.0
    trained_share = family_counts["trained"] / total if total else 0.0
    llm_share = family_counts["llm"] / total if total else 0.0

    # ── Weekly trend (calendar weeks, Monday start; empty weeks omitted) ──
    cutoff = now - timedelta(weeks=weeks)
    conf_buckets = defaultdict(list)
    fam_buckets = defaultdict(Counter)
    for r in rows:
        if r.created_at and r.created_at >= cutoff:
            week = (r.created_at - timedelta(days=r.created_at.weekday())).date()
            conf_buckets[week].append(r.confidence)
            fam_buckets[week][_family(r.model_version)] += 1
    trend = []
    for week in sorted(conf_buckets):
        vals = conf_buckets[week]
        n = len(vals)
        trend.append({
            "week_start": week.isoformat(),
            "count": n,
            "avg_confidence": round(sum(vals) / n, 4),
            "p25_confidence": round(_p25(vals), 4),
            "fallback_share": round(fam_buckets[week]["fallback"] / n, 4),
        })

    # ── Officer override signals (the human ground truth) ──────────────
    approved = db.query(MSE).filter(MSE.status == "approved").count()
    rejected = db.query(MSE).filter(MSE.status == "rejected").count()
    decided = approved + rejected
    rejection_rate = rejected / decided if decided else 0.0

    # Allocation override: officer assigned a different SNP than the AI's
    # top-scored recommendation (best available proxy — the recommendation
    # shown at decision time is approximated by the highest composite score).
    allocated = (
        db.query(MSE.id, MSE.assigned_snp_id)
        .filter(MSE.assigned_snp_id.isnot(None))
        .all()
    )
    overrides = 0
    if allocated:
        ids = [m.id for m in allocated]
        top_by_mse = {}
        matches = (
            db.query(MatchResult.mse_id, MatchResult.snp_id, MatchResult.composite_score)
            .filter(MatchResult.mse_id.in_(ids))
            .all()
        )
        for mr in matches:
            best = top_by_mse.get(mr.mse_id)
            if best is None or mr.composite_score > best[1]:
                top_by_mse[mr.mse_id] = (mr.snp_id, mr.composite_score)
        for m in allocated:
            best = top_by_mse.get(m.id)
            if best and best[0] != m.assigned_snp_id:
                overrides += 1
    override_rate = overrides / len(allocated) if allocated else 0.0

    # ── Per-domain live confidence vs frozen baseline ──────────────────
    domain_names = {d.code: d.name for d in db.query(OndcDomain.code, OndcDomain.name).all()}
    baseline_domains = _BASELINE.get("per_domain") or {}
    by_domain = defaultdict(list)
    for r in rows:
        by_domain[r.predicted_domain].append(r.confidence)
    domains = []
    for code, vals in sorted(by_domain.items(), key=lambda kv: -len(kv[1])):
        n = len(vals)
        avg = sum(vals) / n
        d_low_share = sum(1 for v in vals if v < LOW_CONF) / n
        base = baseline_domains.get(code)
        if base is None:
            status = "no_baseline"  # outside the training corpus — served zero-shot
        elif d_low_share > 0.30 or avg < LOW_CONF + 0.05:
            status = "watch"
        else:
            status = "ok"
        domains.append({
            "code": code,
            "name": domain_names.get(code, code),
            "count": n,
            "avg_confidence": round(avg, 4),
            "low_conf_share": round(d_low_share, 4),
            "baseline_f1": base["f1"] if base else None,
            "baseline_support": base["support"] if base else None,
            "status": status,
        })

    # ── Alerts + overall status ────────────────────────────────────────
    alerts = []
    if total and fallback_share > FALLBACK_ALERT:
        alerts.append({
            "severity": "red",
            "code": "fallback_share",
            "message": (
                f"Keyword fallback answered {fallback_share:.0%} of classifications "
                f"(threshold {FALLBACK_ALERT:.0%}). The trained model and LLM are "
                "failing on live input — retraining is recommended."
            ),
        })
    if allocated and override_rate > OVERRIDE_ALERT:
        alerts.append({
            "severity": "red",
            "code": "override_rate",
            "message": (
                f"Officers overrode the AI's top SNP recommendation in "
                f"{override_rate:.0%} of allocations (threshold {OVERRIDE_ALERT:.0%}). "
                "The matcher is drifting from officer judgment — retraining is recommended."
            ),
        })
    if total and low_conf_share > 0.30:
        alerts.append({
            "severity": "amber",
            "code": "low_confidence",
            "message": (
                f"{low_conf_share:.0%} of classifications fall below the "
                f"{LOW_CONF:.0%} confidence gate — live input may be drifting "
                "from the training corpus."
            ),
        })
    if decided and rejection_rate > 0.25:
        alerts.append({
            "severity": "amber",
            "code": "rejection_rate",
            "message": (
                f"Officers rejected {rejection_rate:.0%} of reviewed registrations — "
                "check upstream data quality (Sathi extraction or classification)."
            ),
        })
    watch = [d["code"] for d in domains if d["status"] == "watch"]
    if watch:
        alerts.append({
            "severity": "amber",
            "code": "domain_watch",
            "message": (
                "Live confidence is sagging vs the training baseline in: "
                + ", ".join(watch) + "."
            ),
        })
    if any(a["severity"] == "red" for a in alerts):
        status = "red"
    elif alerts:
        status = "amber"
    else:
        status = "green"

    baseline_meta = _BASELINE.get("meta") or {}
    return {
        "generated_at": now.isoformat(),
        "status": status,
        "alerts": alerts,
        "thresholds": {
            "fallback_alert": FALLBACK_ALERT,
            "override_alert": OVERRIDE_ALERT,
            "low_confidence": LOW_CONF,
        },
        "summary": {
            "total_classifications": total,
            "avg_confidence": round(sum(confidences) / total, 4) if total else None,
            "p25_confidence": round(_p25(confidences), 4) if total else None,
            "low_conf_share": round(low_conf_share, 4),
            "window_weeks": weeks,
        },
        "engine_mix": {
            "families": [
                {
                    "family": fam,
                    "label": ENGINE_FAMILY_LABELS[fam],
                    "count": family_counts.get(fam, 0),
                    "share": round(family_counts.get(fam, 0) / total, 4) if total else 0.0,
                }
                for fam in ("trained", "llm", "fallback", "other")
            ],
            "engines": [
                {"engine": eng, "count": cnt}
                for eng, cnt in engine_counts.most_common()
            ],
            "trained_share": round(trained_share, 4),
            "llm_share": round(llm_share, 4),
            "fallback_share": round(fallback_share, 4),
        },
        "confidence_trend": trend,
        "oversight": {
            "reviews_decided": decided,
            "approved": approved,
            "rejected": rejected,
            "rejection_rate": round(rejection_rate, 4),
            "allocations": len(allocated),
            "allocation_overrides": overrides,
            "allocation_override_rate": round(override_rate, 4),
        },
        "domains": domains,
        "baseline": {
            "trained": baseline_meta.get("trained"),
            "model": baseline_meta.get("model"),
            "test_accuracy": _BASELINE.get("test_accuracy"),
            "test_macro_f1": _BASELINE.get("test_macro_f1"),
            "covered_domains": sorted(baseline_domains.keys()),
        },
    }


@router.get("/feedback-export")
def feedback_export(
    limit: int = Query(default=1000, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Export officer-reviewed classifications as retraining data (the
    feedback flywheel: monitor detects drift -> this endpoint supplies the
    human-vetted rows -> scripts/build_training_corpus_v2.py merges them).

    Labels are WEAK supervision: an approved registration means an officer
    accepted the whole profile (not the domain specifically); rejections
    flag rows to exclude. Domain corrections are not yet captured in the
    review UI — noted in meta so downstream training treats these honestly.
    """
    rows = (
        db.query(
            MSE.id, MSE.description, MSE.products, MSE.language,
            MSE.status, MSE.reviewed_by, MSE.reviewed_at,
            ClassificationResult.predicted_domain,
            ClassificationResult.confidence,
            ClassificationResult.model_version,
            ClassificationResult.created_at,
        )
        .join(ClassificationResult, ClassificationResult.mse_id == MSE.id)
        .filter(MSE.status.in_(["approved", "rejected"]))
        .order_by(ClassificationResult.created_at.desc())
        .limit(limit)
        .all()
    )
    samples = []
    for r in rows:
        products = (r.products or "").replace("|", ", ") if isinstance(r.products, str) else ""
        text = f"{r.description or ''} Products: {products}".strip() if products else (r.description or "")
        samples.append({
            "mse_id": r.id,
            "text": text,
            "language": r.language,
            "predicted_domain": r.predicted_domain,
            "confidence": r.confidence,
            "engine": r.model_version,
            "officer_outcome": r.status,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "classified_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {
        "meta": {
            "generated_at": datetime.utcnow().isoformat(),
            "n": len(samples),
            "label_semantics": (
                "weak supervision — 'approved' means the officer accepted the "
                "registration as a whole, not the domain specifically; use as "
                "positive-confirmation signal. 'rejected' rows should be "
                "excluded or manually re-labelled. Explicit domain-correction "
                "capture in the review UI is a planned upgrade."
            ),
            "intended_use": "merge into training_corpus_v2.csv as source=officer_feedback",
        },
        "samples": samples,
    }
