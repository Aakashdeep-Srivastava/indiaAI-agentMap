"""Tests for classification routes (/classify)."""

from database import AuditLog, ClassificationResult


# ── POST /classify/ ──────────────────────────────────────────────────


def test_classify_mse_by_id(client, seed_mse):
    resp = client.post("/classify/", json={"mse_id": seed_mse.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mse_id"] == seed_mse.id
    assert len(data["top3"]) == 3
    assert data["selected_domain"] in ("RET10", "RET12", "RET14", "RET16", "RET18")
    assert 0 < data["confidence"] <= 1.0


def test_classify_mse_not_found(client):
    resp = client.post("/classify/", json={"mse_id": 99999})
    assert resp.status_code == 404


def test_classify_creates_classification_result(client, seed_mse, db_session):
    resp = client.post("/classify/", json={"mse_id": seed_mse.id})
    data = resp.json()

    cr = (
        db_session.query(ClassificationResult)
        .filter(ClassificationResult.mse_id == seed_mse.id)
        .first()
    )
    assert cr is not None
    assert cr.predicted_domain == data["selected_domain"]


def test_classify_creates_audit_log(client, seed_mse, db_session):
    client.post("/classify/", json={"mse_id": seed_mse.id})
    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "mse_classified", AuditLog.entity_id == seed_mse.id)
        .first()
    )
    assert log is not None
    assert log.performed_by == "muril-v1-lora"


# ── POST /classify/text ──────────────────────────────────────────────


def test_classify_text_grocery(client):
    payload = {"description": "We sell rice, dal, atta and spices wholesale", "language": "en"}
    resp = client.post("/classify/text", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["mse_id"] == 0
    assert data["selected_domain"] == "RET10"
    assert len(data["top3"]) == 3


def test_classify_text_fashion(client):
    payload = {"description": "Traditional silk saree weaving and kurta garments"}
    resp = client.post("/classify/text", json=payload)
    assert resp.status_code == 200
    assert resp.json()["selected_domain"] == "RET12"


def test_classify_text_electronics(client):
    payload = {"description": "Mobile phone repair and laptop computer service center"}
    resp = client.post("/classify/text", json=payload)
    assert resp.status_code == 200
    assert resp.json()["selected_domain"] == "RET14"


def test_classify_text_empty_returns_400(client):
    resp = client.post("/classify/text", json={"description": ""})
    assert resp.status_code == 400


def test_classify_text_whitespace_returns_400(client):
    resp = client.post("/classify/text", json={"description": "   "})
    assert resp.status_code == 400


def test_classify_text_confidence_bounds(client):
    resp = client.post("/classify/text", json={"description": "rice dal flour grocery"})
    data = resp.json()
    for pred in data["top3"]:
        assert 0 <= pred["confidence"] <= 1.0


# ── GET /classify/history/{mse_id} ───────────────────────────────────


def test_classify_history_returns_results(client, seed_mse):
    # Classify twice
    client.post("/classify/", json={"mse_id": seed_mse.id})
    client.post("/classify/", json={"mse_id": seed_mse.id})

    resp = client.get(f"/classify/history/{seed_mse.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    # Newest first
    assert data[0]["created_at"] >= data[1]["created_at"]


def test_classify_history_mse_not_found(client):
    resp = client.get("/classify/history/99999")
    assert resp.status_code == 404


def test_classify_history_empty(client, seed_mse):
    resp = client.get(f"/classify/history/{seed_mse.id}")
    assert resp.status_code == 200
    assert resp.json() == []
