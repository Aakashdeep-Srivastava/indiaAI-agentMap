"""Unit tests for the matcher service (scoring functions)."""

from types import SimpleNamespace

from services.matcher import (
    W_COMMISSION,
    W_DOMAIN,
    W_GEO,
    W_HISTORY,
    W_SENTIMENT,
    _commission_score,
    _domain_score,
    _geo_score,
    _history_score,
    _sentiment_score,
    compute_match_scores,
)


# ── _domain_score ────────────────────────────────────────────────────


def test_domain_score_exact_match():
    assert _domain_score("RET10", "RET10") == 1.0


def test_domain_score_multi_domain_match():
    assert _domain_score("RET10", "RET10,RET18") == 1.0


def test_domain_score_no_match():
    assert _domain_score("RET10", "RET12") == 0.2


def test_domain_score_none_predicted():
    assert _domain_score(None, "RET10") == 0.0


def test_domain_score_none_snp_domains():
    assert _domain_score("RET10", None) == 0.0


# ── _geo_score ───────────────────────────────────────────────────────


def test_geo_score_district_match():
    assert _geo_score("Maharashtra", "Pune", "Pune,Mumbai") == 1.0


def test_geo_score_state_match():
    assert _geo_score("Maharashtra", "Pune", "Maharashtra,Gujarat") == 0.6


def test_geo_score_pan_india():
    assert _geo_score("Maharashtra", "Pune", "Pan-India") == 0.4


def test_geo_score_no_overlap():
    assert _geo_score("Maharashtra", "Pune", "Delhi,UP") == 0.2


def test_geo_score_none_coverage():
    assert _geo_score("Maharashtra", "Pune", None) == 0.3


# ── _commission_score ────────────────────────────────────────────────


def test_commission_score_zero():
    assert _commission_score(0.0) == 1.0


def test_commission_score_max():
    assert _commission_score(15.0) == 0.0


def test_commission_score_above_max():
    assert _commission_score(20.0) == 0.0


def test_commission_score_mid():
    assert abs(_commission_score(7.5) - 0.5) < 0.01


# ── _history_score ───────────────────────────────────────────────────


def test_history_score_zero():
    assert _history_score(0.0) == 0.0


def test_history_score_max():
    assert _history_score(5.0) == 1.0


def test_history_score_mid():
    assert abs(_history_score(2.5) - 0.5) < 0.01


def test_history_score_clamped():
    assert _history_score(10.0) == 1.0


# ── _sentiment_score ─────────────────────────────────────────────────


def test_sentiment_full_support_lang_match():
    score = _sentiment_score("full", "en,hi", "en")
    # 0.6 * 1.0 + 0.4 * 1.0 = 1.0
    assert abs(score - 1.0) < 0.01


def test_sentiment_none_support():
    score = _sentiment_score("none", "en", "en")
    # 0.6 * 0.1 + 0.4 * 1.0 = 0.46
    assert abs(score - 0.46) < 0.01


def test_sentiment_no_lang_match():
    score = _sentiment_score("full", "en,hi", "ta")
    # 0.6 * 1.0 + 0.4 * 0.3 = 0.72
    assert abs(score - 0.72) < 0.01


# ── compute_match_scores ─────────────────────────────────────────────


def _make_mse(**kwargs):
    defaults = {"state": "Maharashtra", "district": "Pune", "language": "en"}
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _make_snp(**kwargs):
    defaults = {
        "domain_codes": "RET10",
        "geo_coverage": "Pan-India",
        "commission_pct": 5.0,
        "rating": 4.0,
        "onboarding_support": "full",
        "languages_supported": "en,hi",
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_compute_match_scores_returns_all_snps():
    mse = _make_mse()
    snps = [_make_snp(), _make_snp(domain_codes="RET12")]
    results = compute_match_scores(mse, snps, "RET10")
    assert len(results) == 2


def test_compute_match_scores_composite_formula():
    mse = _make_mse()
    snp = _make_snp()
    results = compute_match_scores(mse, [snp], "RET10")
    r = results[0]
    expected = (
        W_DOMAIN * r["domain"]
        + W_GEO * r["geo"]
        + W_COMMISSION * r["commission"]
        + W_HISTORY * r["history"]
        + W_SENTIMENT * r["sentiment"]
    )
    assert abs(r["composite"] - expected) < 0.001


def test_compute_match_scores_domain_aligned_higher():
    mse = _make_mse()
    snp_match = _make_snp(domain_codes="RET10", rating=4.0)
    snp_no_match = _make_snp(domain_codes="RET12", rating=4.0)
    results = compute_match_scores(mse, [snp_match, snp_no_match], "RET10")
    assert results[0]["composite"] > results[1]["composite"]
