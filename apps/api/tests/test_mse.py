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
        "udyam_number": "UDYAM-MIN-001",
        "name": "Minimal Store",
        "description": "A simple store",
    }
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["language"] == "en"


def test_register_mse_with_enum_fields(client):
    payload = _mse_payload(
        udyam_number="UDYAM-ENUM-001",
        gender_owner="female",
        turnover_band="small",
    )
    resp = client.post("/mse/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["gender_owner"] == "female"
    assert data["turnover_band"] == "small"


# ── GET /mse/ ────────────────────────────────────────────────────────


def test_list_mses_empty(client):
    resp = client.get("/mse/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_mses_returns_all(client):
    for i in range(3):
        client.post("/mse/", json=_mse_payload(udyam_number=f"UDYAM-LIST-{i}"))
    resp = client.get("/mse/")
    assert len(resp.json()) == 3


def test_list_mses_filter_by_state(client):
    client.post("/mse/", json=_mse_payload(udyam_number="UDYAM-MH-001", state="Maharashtra"))
    client.post("/mse/", json=_mse_payload(udyam_number="UDYAM-KA-001", state="Karnataka"))
    resp = client.get("/mse/?state=Maharashtra")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["state"] == "Maharashtra"


def test_list_mses_pagination(client):
    for i in range(5):
        client.post("/mse/", json=_mse_payload(udyam_number=f"UDYAM-PAGE-{i}"))
    resp = client.get("/mse/?skip=2&limit=2")
    assert len(resp.json()) == 2


# ── GET /mse/{id} ────────────────────────────────────────────────────


def test_get_mse_by_id(client):
    create_resp = client.post("/mse/", json=_mse_payload())
    mse_id = create_resp.json()["id"]

    resp = client.get(f"/mse/{mse_id}")
    assert resp.status_code == 200
    assert resp.json()["udyam_number"] == "UDYAM-TEST-REG-001"


def test_get_mse_not_found(client):
    resp = client.get("/mse/99999")
    assert resp.status_code == 404
