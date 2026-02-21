"""Multi-factor MSE-to-SNP scoring engine.

Implements the composite scoring formula:
    M(mse, snp) = 0.35*D + 0.20*G + 0.15*C + 0.20*H + 0.10*S

Where:
    D = Domain alignment score
    G = Geographic proximity score
    C = Commission competitiveness score
    H = Historical performance / rating score
    S = Sentiment / support quality score

In production, D uses IndicBERT cosine similarity between MSE description
embeddings and SNP capability embeddings. For the PoC we use deterministic
heuristics that exercise the full scoring pipeline.
"""

from typing import Any


# ── Weight constants ──────────────────────────────────────────────────

W_DOMAIN = 0.35
W_GEO = 0.20
W_COMMISSION = 0.15
W_HISTORY = 0.20
W_SENTIMENT = 0.10


def compute_match_scores(mse: Any, snps: list[Any], predicted_domain: str | None) -> list[dict]:
    """Score every SNP against the given MSE and return factor breakdowns."""
    results = []

    for snp in snps:
        d = _domain_score(predicted_domain, snp.domain_codes)
        g = _geo_score(mse.state, mse.district, snp.geo_coverage)
        c = _commission_score(snp.commission_pct)
        h = _history_score(snp.rating)
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
        })

    return results


# ── Factor functions ──────────────────────────────────────────────────

def _domain_score(predicted_domain: str | None, snp_domains: str | None) -> float:
    """1.0 if the SNP covers the predicted ONDC domain, else 0.2 partial."""
    if not predicted_domain or not snp_domains:
        return 0.0
    domains = [d.strip() for d in snp_domains.split(",")]
    return 1.0 if predicted_domain in domains else 0.2


def _geo_score(mse_state: str | None, mse_district: str | None, snp_coverage: str | None) -> float:
    """Geographic overlap: 1.0 = district match, 0.6 = state match, 0.3 = national."""
    if not snp_coverage:
        return 0.3  # assume national reach
    coverage = snp_coverage.lower()
    if mse_district and mse_district.lower() in coverage:
        return 1.0
    if mse_state and mse_state.lower() in coverage:
        return 0.6
    if "all" in coverage or "pan-india" in coverage:
        return 0.4
    return 0.2


def _commission_score(commission_pct: float) -> float:
    """Lower commission = better for MSE. Scale 0-15% to 1.0-0.0."""
    if commission_pct <= 0:
        return 1.0
    if commission_pct >= 15:
        return 0.0
    return 1.0 - (commission_pct / 15.0)


def _history_score(rating: float) -> float:
    """Normalise SNP rating (0-5) to 0-1."""
    return min(max(rating / 5.0, 0.0), 1.0)


def _sentiment_score(support_level: str | None, languages: str | None, mse_lang: str) -> float:
    """Combine onboarding support quality and language match."""
    support_map = {"full": 1.0, "partial": 0.5, "none": 0.1}
    support = support_map.get(support_level or "none", 0.1)

    lang_match = 0.5
    if languages and mse_lang:
        supported = [l.strip().lower() for l in languages.split(",")]
        lang_match = 1.0 if mse_lang.lower() in supported else 0.3

    return 0.6 * support + 0.4 * lang_match
