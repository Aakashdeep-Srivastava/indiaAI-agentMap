"""Tests for MSE registration and retrieval routes (/mse)."""

from database import AuditLog


def _mse_payload(**overrides):
    base = {
        "udyam_number": "UDYAM-TEST-REG-001",
        "name": "Test Kirana Store",
        "description": "Retail grocery and provision store in Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "pin_code": "411001",
        "language": "hi",
        # DPDP Act 2023 — registration is refused without explicit consent.
        "consent_given": True,
    }
    base.update(overrides)
    return base


# ── POST /mse/ ───────────────────────────────────────────────────────


def test_register_mse_success(client):
    resp = client.post("/mse/", json=_mse_payload())
    assert resp.status_code == 201
    data = resp.json()
    assert data["udyam_number"] == "UDYAM-TEST-REG-001"
    assert data["name"] == "Test Kirana Store"
    assert data["id"] > 0
    assert "created_at" in data


def test_register_mse_creates_audit_log(client, db_session):
    resp = client.post("/mse/", json=_mse_payload())
    mse_id = resp.json()["id"]

    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "mse_registered", AuditLog.entity_id == mse_id)
        .first()
    )
    assert log is not None
    assert log.entity_type == "mse"


def test_register_mse_duplicate_returns_409(client):
    client.post("/mse/", json=_mse_payload())
    resp = client.post("/mse/", json=_mse_payload())
    assert resp.status_code == 409


def test_register_mse_minimal_fields(client):
    payload = {
        "name": "Minimal Store",
        "description": "A simple store",
        "consent_given": True,
    }
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["language"] == "en"


def test_register_mse_without_consent_is_refused(client):
    """DPDP Act 2023 — consent is the precondition, not a nice-to-have."""
    payload = _mse_payload(udyam_number="UDYAM-NOCONSENT-001", consent_given=False)
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 422


def test_register_mse_without_udyam_is_allowed(client):
    """Udyam became optional — the long tail of informal MSEs has no number."""
    payload = _mse_payload()
    payload.pop("udyam_number")
    payload["email"] = "no-udyam@example.com"
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 201


def test_register_mse_with_enum_fields(client):
    payload = _mse_payload(
        udyam_number="UDYAM-ENUM-001",
        turnover_band="small",
    )
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["turnover_band"] == "small"


# ── GET /mse/ ────────────────────────────────────────────────────────


# These run against the shared Postgres instance, which already holds
# thousands of real registrations. Assertions are therefore relative to a
# baseline, or scoped to the rows the test itself created — never absolute
# counts, which would only ever pass on an empty database.


def test_list_mses_requires_admin(client):
    """Enterprise records are personal data — the roster is officer-only."""
    resp = client.get("/mse/")
    assert resp.status_code in (401, 403)


def test_list_mses_includes_newly_registered(admin_client):
    before = len(admin_client.get("/mse/?limit=1000").json())
    for i in range(3):
        admin_client.post("/mse/", json=_mse_payload(udyam_number=f"UDYAM-LIST-{i}"))
    after = admin_client.get("/mse/?limit=1000").json()
    assert len(after) == before + 3


def test_list_mses_filter_by_state(admin_client):
    admin_client.post(
        "/mse/", json=_mse_payload(udyam_number="UDYAM-MH-001", state="Maharashtra")
    )
    admin_client.post(
        "/mse/", json=_mse_payload(udyam_number="UDYAM-KA-001", state="Karnataka")
    )
    data = admin_client.get("/mse/?state=Maharashtra&limit=1000").json()
    assert data, "expected at least the row this test created"
    # The filter must not leak other states, however many rows come back.
    assert {row["state"] for row in data} == {"Maharashtra"}


def test_list_mses_pagination(admin_client):
    for i in range(5):
        admin_client.post("/mse/", json=_mse_payload(udyam_number=f"UDYAM-PAGE-{i}"))
    resp = admin_client.get("/mse/?skip=2&limit=2")
    assert len(resp.json()) == 2


# ── GET /mse/{id} ────────────────────────────────────────────────────


def test_get_mse_by_id(admin_client):
    create_resp = admin_client.post("/mse/", json=_mse_payload())
    mse_id = create_resp.json()["id"]

    resp = admin_client.get(f"/mse/{mse_id}")
    assert resp.status_code == 200
    assert resp.json()["udyam_number"] == "UDYAM-TEST-REG-001"


def test_get_mse_requires_authentication(client):
    resp = client.get("/mse/99999")
    assert resp.status_code in (401, 403)


def test_get_mse_not_found(admin_client):
    resp = admin_client.get("/mse/99999999")
    assert resp.status_code == 404
