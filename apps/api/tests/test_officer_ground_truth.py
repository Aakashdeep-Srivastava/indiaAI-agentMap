"""Officer ground-truth capture — POST /classify/{id}/verify and friends.

These cover the labels the pilot depends on: the officer's verdict on a
prediction (the only source of leaf-level ground truth) and the accept/override
signal on an SNP allocation.

REQUIRES the 2026-08-09_officer_ground_truth.sql migration. Without it every
test here fails on UndefinedColumn — which is itself the point: the API cannot
serve these routes until the schema is applied.
"""

from database import AuditLog, ClassificationResult

# admin_client / mse_client come from conftest.py.
OFFICER = "nsic-test@msmemate.com"


# ── Authorisation ────────────────────────────────────────────────────


def test_verify_rejects_anonymous(client, seed_classification):
    """The verdict writes a training label — it must never be open."""
    resp = client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "confirmed"},
    )
    assert resp.status_code in (401, 403)


# ── Input validation ─────────────────────────────────────────────────


def test_verify_rejects_unknown_verdict(admin_client, seed_classification):
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "maybe"},
    )
    assert resp.status_code == 422


def test_verify_corrected_requires_a_domain(admin_client, seed_classification):
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected"},
    )
    assert resp.status_code == 422
    assert "domain is required" in resp.json()["detail"]


def test_verify_rejects_unknown_domain_code(
    admin_client, seed_domains, seed_classification
):
    """A typo must not become a training label."""
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected", "domain": "RET99"},
    )
    assert resp.status_code == 422
    assert "Unknown ONDC domain" in resp.json()["detail"]


def test_verify_rejects_unknown_category_code(
    admin_client, seed_domains, seed_classification
):
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected", "domain": "RET12", "category": "RET12-999"},
    )
    assert resp.status_code == 422
    assert "Unknown ONDC category" in resp.json()["detail"]


def test_verify_rejects_category_from_a_different_domain(
    admin_client, seed_domains, seed_classification
):
    """RET10-001 is a Grocery leaf; pairing it with Fashion is incoherent."""
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected", "domain": "RET12", "category": "RET10-001"},
    )
    assert resp.status_code == 422
    assert "does not belong to" in resp.json()["detail"]


def test_verify_unknown_result_returns_404(admin_client):
    resp = admin_client.post(
        "/classify/99999999/verify", json={"verdict": "confirmed"}
    )
    assert resp.status_code == 404


# ── Label capture ────────────────────────────────────────────────────


def test_confirmed_stores_the_prediction_as_the_label(
    admin_client, db_session, seed_classification
):
    """Gold rows must read uniformly — consumers should never branch on
    verdict to find the answer."""
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "confirmed"},
    )
    assert resp.status_code == 200

    body = resp.json()
    assert body["officer_verdict"] == "confirmed"
    assert body["officer_domain"] == seed_classification.predicted_domain
    assert body["corrected_by"] == OFFICER

    row = db_session.query(ClassificationResult).get(seed_classification.id)
    assert row.officer_domain == "RET10"
    assert row.corrected_at is not None


def test_corrected_stores_the_leaf_label(
    admin_client, db_session, seed_domains, seed_classification
):
    """The whole reason this endpoint exists: a leaf-level ground-truth label."""
    resp = admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={
            "verdict": "corrected",
            "domain": "RET12",
            "category": "RET12-001",
            "note": "sells sarees, not groceries",
        },
    )
    assert resp.status_code == 200

    row = db_session.query(ClassificationResult).get(seed_classification.id)
    assert row.officer_verdict == "corrected"
    assert row.officer_domain == "RET12"
    assert row.officer_category == "RET12-001"
    assert row.officer_note == "sells sarees, not groceries"
    # The original prediction must survive — otherwise the label is useless
    # for measuring how wrong the model was.
    assert row.predicted_domain == "RET10"


def test_verify_writes_an_audit_entry(
    admin_client, db_session, seed_domains, seed_classification
):
    admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected", "domain": "RET12"},
    )
    log = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.action == "classification_corrected",
            AuditLog.entity_id == seed_classification.id,
        )
        .first()
    )
    assert log is not None
    assert log.entity_type == "classification_result"
    assert log.performed_by == OFFICER


# ── Allocation accept/override signal ────────────────────────────────


def test_allocate_records_what_the_ai_recommended(
    admin_client, db_session, seed_mse, seed_snps
):
    """Without this the override rate is a post-hoc guess."""
    from database import MSE

    seed_mse.status = "approved"
    db_session.flush()

    chosen, recommended = seed_snps[1], seed_snps[0]
    resp = admin_client.post(
        f"/mse/{seed_mse.id}/allocate",
        json={"snp_id": chosen.id, "recommended_snp_id": recommended.id},
    )
    assert resp.status_code == 200

    row = db_session.query(MSE).get(seed_mse.id)
    assert row.assigned_snp_id == chosen.id
    assert row.recommended_snp_id == recommended.id

    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "mse_allocated", AuditLog.entity_id == seed_mse.id)
        .first()
    )
    assert "overrode AI recommendation" in log.details


def test_allocate_marks_an_accepted_recommendation(
    admin_client, db_session, seed_mse, seed_snps
):
    seed_mse.status = "approved"
    db_session.flush()

    snp = seed_snps[0]
    admin_client.post(
        f"/mse/{seed_mse.id}/allocate",
        json={"snp_id": snp.id, "recommended_snp_id": snp.id},
    )
    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "mse_allocated", AuditLog.entity_id == seed_mse.id)
        .first()
    )
    assert "accepted AI recommendation" in log.details


# ── Feedback export label strength ───────────────────────────────────


def test_feedback_export_separates_gold_from_weak(
    admin_client, db_session, seed_domains, seed_mse, seed_classification
):
    """Training on a whole-profile approval as if it were a domain label is
    exactly the mistake label_strength exists to prevent."""
    seed_mse.status = "approved"
    db_session.flush()

    admin_client.post(
        f"/classify/{seed_classification.id}/verify",
        json={"verdict": "corrected", "domain": "RET12", "category": "RET12-001"},
    )

    resp = admin_client.get("/model-health/feedback-export")
    assert resp.status_code == 200
    body = resp.json()

    assert body["meta"]["n_gold"] >= 1
    assert body["meta"]["n_with_leaf_label"] >= 1

    gold = [s for s in body["samples"] if s["label_strength"] == "gold"]
    assert gold, "the verified row must be exported as gold"
    assert gold[0]["label_domain"] == "RET12"
    assert gold[0]["label_category"] == "RET12-001"
