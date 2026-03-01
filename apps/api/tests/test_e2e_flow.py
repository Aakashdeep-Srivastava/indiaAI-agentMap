"""End-to-end flow tests: register -> classify -> match."""

from database import AuditLog


def test_full_pipeline_register_classify_match(client, seed_snps, db_session):
    """Complete user journey: register MSE, classify, then match to SNPs."""
    # Step 1: Register MSE
    mse_payload = {
        "udyam_number": "UDYAM-E2E-001",
        "name": "E2E Test Grocery Shop",
        "description": "We sell rice, dal, atta flour and cooking oil wholesale",
        "state": "Maharashtra",
        "district": "Pune",
        "pin_code": "411001",
        "language": "en",
    }
    reg_resp = client.post("/mse/", json=mse_payload)
    assert reg_resp.status_code == 201
    mse_id = reg_resp.json()["id"]

    # Step 2: Classify
    classify_resp = client.post("/classify/", json={"mse_id": mse_id})
    assert classify_resp.status_code == 200
    c_data = classify_resp.json()
    assert c_data["selected_domain"] == "RET10"

    # Step 3: Match
    match_resp = client.post("/match/", json={"mse_id": mse_id, "top_k": 3})
    assert match_resp.status_code == 200
    m_data = match_resp.json()
    assert m_data["predicted_domain"] == "RET10"
    assert len(m_data["matches"]) == 3
    assert m_data["matches"][0]["composite_score"] > 0

    # Step 4: Verify audit trail
    logs = (
        db_session.query(AuditLog)
        .filter(AuditLog.entity_id == mse_id, AuditLog.entity_type == "mse")
        .order_by(AuditLog.created_at)
        .all()
    )
    actions = [a.action for a in logs]
    assert "mse_registered" in actions
    assert "mse_classified" in actions
    assert "mse_matched" in actions


def test_pipeline_match_uses_latest_classification(client, seed_snps, db_session):
    """When classified multiple times, match should use the latest result."""
    # Register
    resp = client.post("/mse/", json={
        "udyam_number": "UDYAM-E2E-002",
        "name": "Multi-classify Test",
        "description": "We sell rice, dal, atta flour and cooking oil",
        "state": "Maharashtra",
        "language": "en",
    })
    mse_id = resp.json()["id"]

    # Classify twice
    client.post("/classify/", json={"mse_id": mse_id})
    client.post("/classify/", json={"mse_id": mse_id})

    # Match — should use latest classification
    match_resp = client.post("/match/", json={"mse_id": mse_id})
    assert match_resp.status_code == 200
    assert match_resp.json()["predicted_domain"] is not None

    # Verify history has 2 entries
    history_resp = client.get(f"/classify/history/{mse_id}")
    assert len(history_resp.json()) == 2
