"""Multi-factor MSE-to-SNP scoring engine (weighted-multifactor-v2).

Implements the composite scoring formula:
    M(mse, snp) = 0.35*D + 0.20*G + 0.15*C + 0.20*H + 0.10*S

Where:
    D = Domain alignment score (exact / multi-category / undisclosed aware)
    G = Geographic proximity score (district > state > pan-India)
    C = Commission competitiveness score
    H = Historical performance — rating shrunk toward the network prior
        (Bayesian smoothing; cold-start SNPs get the prior, not zero),
        blended with capacity headroom and onboarding speed
    S = Sentiment / support quality score (onboarding support + language)

v2 fixes real-registry data handling: "RET-MULTI" multi-category SNPs,
empty domain lists (101 of 281 registry entries), and "Pan India" coverage
spelling. Capacity/onboarding-days come from apps/api/data/snp_capacity.json
(capacity is synthetic-disclosed pending TEAM-portal integration).
Weights are server-side only — never expose them in API responses or UI.
"""

import json
import re
from pathlib import Path
from typing import Any


# ── Weight constants ──────────────────────────────────────────────────

W_DOMAIN = 0.35
W_GEO = 0.20
W_COMMISSION = 0.15
W_HISTORY = 0.20
W_SENTIMENT = 0.10

# Network prior: mean rating across the 281 ONDC registry SNPs (4.0/5).
# Ratings are shrunk toward it so a thin history can't dominate ranking,
# and unrated (cold-start) SNPs are explored rather than buried.
RATING_PRIOR = 4.0
RATING_OBS_WEIGHT = 0.75  # weight of the SNP's own rating vs the prior

_CAPACITY_PATH = Path(__file__).resolve().parent.parent / "data" / "snp_capacity.json"
_capacity_cache: dict | None = None


def _capacity_data() -> dict:
    """subscriber_id -> [capacity_score 0-1, avg_onboarding_days]."""
    global _capacity_cache
    if _capacity_cache is None:
        try:
            _capacity_cache = json.loads(_CAPACITY_PATH.read_text(encoding="utf-8"))
        except Exception:
            _capacity_cache = {}
    return _capacity_cache


def compute_match_scores(mse: Any, snps: list[Any], predicted_domain: str | None) -> list[dict]:
    """Score every SNP against the given MSE and return factor breakdowns."""
    results = []

    for snp in snps:
        d = _domain_score(predicted_domain, snp.domain_codes)
        g = _geo_score(mse.state, mse.district, snp.geo_coverage)
        c = _commission_score(snp.commission_pct)
        h = _history_score(snp)
        s = _sentiment_score(snp.onboarding_support, snp.languages_supported, mse.language)

        composite = W_DOMAIN * d + W_GEO * g + W_COMMISSION * c + W_HISTORY * h + W_SENTIMENT * s

        results.append({
            "snp": snp,
            "domain": d,
            "geo": g,
            "commission": c,
            "history": h,
            "sentiment": s,
            "composite": composite,
            "fit_reasons": _fit_reasons(mse, snp, d, g),
        })

    return results


# ── Human-readable fit reasons (qualitative — safe for every role) ────

def _fit_reasons(mse: Any, snp: Any, d: float, g: float) -> list[str]:
    reasons: list[str] = []
    if d >= 1.0:
        reasons.append("Covers your product domain")
    elif d >= 0.85:
        reasons.append("Multi-category platform — covers your domain")
    if g >= 1.0 and mse.district:
        reasons.append(f"Serves {mse.district}")
    elif g >= 0.6 and mse.state:
        reasons.append(f"Serves {mse.state}")
    elif snp.geo_coverage and "pan" in snp.geo_coverage.lower():
        reasons.append("Pan-India reach")
    if (snp.commission_pct or 0) <= 4:
        reasons.append("Low commission")
    if (snp.rating or 0) >= 4.3:
        reasons.append(f"Highly rated ({snp.rating:.1f}★)")
    if snp.onboarding_support == "full":
        reasons.append("Full onboarding support")
    if snp.languages_supported and mse.language:
        langs = [l.strip().lower() for l in snp.languages_supported.split(",")]
        if mse.language.lower() in langs and mse.language.lower() != "en":
            names = {"hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada",
                     "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati", "ml": "Malayalam",
                     "pa": "Punjabi", "or": "Odia", "as": "Assamese"}
            reasons.append(f"{names.get(mse.language.lower(), mse.language)} support")
    return reasons[:4]


# ── Capability-gap nudges (what unlocks better onboarding) ────────────

def readiness_nudges(mse: Any) -> list[str]:
    """Actionable, honest suggestions that improve the MSE's onboarding odds."""
    nudges: list[str] = []
    if not getattr(mse, "gst_number", None):
        nudges.append(
            "Add your GST number — most seller platforms require it to list "
            "products, and B2B platforms won't onboard without it."
        )
    if not getattr(mse, "pan_number", None):
        nudges.append("Add your PAN — needed for seller-platform payouts.")
    if not getattr(mse, "products", None):
        nudges.append(
            "List your top products — a richer catalogue improves both matching "
            "and your visibility once live on ONDC."
        )
    if not getattr(mse, "mobile_number", None):
        nudges.append("Add a mobile number so your seller platform can reach you.")
    return nudges[:3]


# ── Factor functions ──────────────────────────────────────────────────

_MULTI_TOKENS = {"ret-multi", "multi", "all"}


def _domain_score(predicted_domain: str | None, snp_domains: str | None) -> float:
    """Domain alignment against real registry data.

    1.0 exact domain coverage · 0.85 multi-category SNP (covers the domain,
    ranked just below a specialist) · 0.3 undisclosed domain list (unknown,
    not disqualifying) · 0.15 specialist in a different domain.
    """
    if not predicted_domain:
        return 0.0
    if not snp_domains or not snp_domains.strip():
        return 0.3
    domains = {d.strip().lower() for d in re.split(r"[,|]", snp_domains) if d.strip()}
    if predicted_domain.lower() in domains:
        return 1.0
    if domains & _MULTI_TOKENS:
        return 0.85
    return 0.15


_PAN_INDIA_RE = re.compile(r"\bpan[\s-]?india\b|\ball[\s-]?india\b|\bnational\b|\ball\b")


def _geo_score(mse_state: str | None, mse_district: str | None, snp_coverage: str | None) -> float:
    """Geographic overlap: 1.0 = district match, 0.6 = state match, 0.4 = pan-India."""
    if not snp_coverage or not snp_coverage.strip():
        return 0.3  # coverage undisclosed — assume national reach
    coverage = snp_coverage.lower()
    if mse_district and mse_district.lower() in coverage:
        return 1.0
    if mse_state and mse_state.lower() in coverage:
        return 0.6
    if _PAN_INDIA_RE.search(coverage):
        return 0.4
    return 0.2


def _commission_score(commission_pct: float) -> float:
    """Lower commission = better for MSE. Scale 0-15% to 1.0-0.0."""
    if commission_pct <= 0:
        return 1.0
    if commission_pct >= 15:
        return 0.0
    return 1.0 - (commission_pct / 15.0)


def _history_score(snp: Any) -> float:
    """Historical performance with Bayesian smoothing and capacity blend.

    The SNP's rating is shrunk toward the network prior so thin evidence
    can't dominate; unrated SNPs get the prior (cold-start exploration
    boost). Where capacity data exists, blends in capacity headroom and
    onboarding speed (synthetic-disclosed pending TEAM-portal data).
    """
    rating = snp.rating or 0.0
    if rating <= 0:
        smoothed = RATING_PRIOR
    else:
        smoothed = RATING_OBS_WEIGHT * rating + (1.0 - RATING_OBS_WEIGHT) * RATING_PRIOR
    base = min(max(smoothed / 5.0, 0.0), 1.0)

    cap = _capacity_data().get(getattr(snp, "subscriber_id", None) or "")
    if cap:
        capacity, days = float(cap[0]), float(cap[1] or 15)
        speed = 1.0 - min(max(days / 30.0, 0.0), 1.0)
        return round(0.6 * base + 0.25 * capacity + 0.15 * speed, 4)
    return round(base, 4)


def _sentiment_score(support_level: str | None, languages: str | None, mse_lang: str) -> float:
    """Combine onboarding support quality and language match."""
    support_map = {"full": 1.0, "partial": 0.5, "none": 0.1}
    support = support_map.get(support_level or "none", 0.1)

    lang_match = 0.5
    if languages and mse_lang:
        supported = [l.strip().lower() for l in re.split(r"[,|]", languages)]
        lang_match = 1.0 if mse_lang.lower() in supported else 0.3

    return 0.6 * support + 0.4 * lang_match
