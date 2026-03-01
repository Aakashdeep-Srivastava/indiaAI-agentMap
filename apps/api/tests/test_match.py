"""Tests for match routes (/match)."""

from database import AuditLog, MatchResult
from services.matcher import W_DOMAIN, W_GEO, W_COMMISSION, W_HISTORY, W_SENTIMENT


# ── POST /match/ ─────────────────────────────────────────────────────


def test_match_success(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mse_id"] == seed_mse.id
    assert data["mse_name"] == seed_mse.name
    assert data["predicted_domain"] == "RET10"
    assert len(data["matches"]) == 5


def test_match_top_k_custom(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id, "top_k": 2})
    assert resp.status_code == 200
    assert len(resp.json()["matches"]) == 2


def test_match_mse_not_found(client):
    resp = client.post("/match/", json={"mse_id": 99999})
    assert resp.status_code == 404


def test_match_no_snps_returns_404(client, seed_mse, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    assert resp.status_code == 404
    assert "No SNPs" in resp.json()["detail"]


def test_match_without_classification(client, seed_mse, seed_snps):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_domain"] is None


def test_match_creates_match_results(client, seed_mse, seed_snps, seed_classification, db_session):
    client.post("/match/", json={"mse_id": seed_mse.id, "top_k": 3})
    results = db_session.query(MatchResult).filter(MatchResult.mse_id == seed_mse.id).all()
    assert len(results) == 3


def test_match_creates_audit_log(client, seed_mse, seed_snps, seed_classification, db_session):
    client.post("/match/", json={"mse_id": seed_mse.id})
    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "mse_matched", AuditLog.entity_id == seed_mse.id)
        .first()
    )
    assert log is not None


def test_match_scores_sorted_descending(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    matches = resp.json()["matches"]
    scores = [m["composite_score"] for m in matches]
    assert scores == sorted(scores, reverse=True)


def test_match_confidence_band_values(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    for m in resp.json()["matches"]:
        score = m["composite_score"]
        band = m["confidence_band"]
        if score >= 0.85:
            assert band == "green"
        elif score >= 0.60:
            assert band == "yellow"
        else:
            assert band == "red"


def test_match_explainer_both_languages(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    for m in resp.json()["matches"]:
        assert len(m["explainer_en"]) > 0
        assert len(m["explainer_hi"]) > 0


def test_match_factors_sum_to_composite(client, seed_mse, seed_snps, seed_classification):
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    for m in resp.json()["matches"]:
        f = m["factors"]
        expected = (
            W_DOMAIN * f["domain_score"]
            + W_GEO * f["geo_score"]
            + W_COMMISSION * f["commission_score"]
            + W_HISTORY * f["history_score"]
            + W_SENTIMENT * f["sentiment_score"]
        )
        assert abs(m["composite_score"] - round(expected, 4)) < 0.01


def test_match_domain_aligned_snp_ranks_higher(client, seed_mse, seed_snps, seed_classification):
    """RET10-domain SNPs should score higher than non-RET10 SNPs."""
    resp = client.post("/match/", json={"mse_id": seed_mse.id})
    matches = resp.json()["matches"]
    # Top match should be a grocery SNP (RET10 domain)
    top_snp_name = matches[0]["snp_name"]
    assert top_snp_name in ("GroceryMart India", "KiranaConnect")
