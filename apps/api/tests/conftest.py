"""Test fixtures for MSMEMate integration tests.

Uses the configured Postgres DB with per-test transaction rollback for isolation.
No separate test database needed — each test runs in a rolled-back transaction.
"""

import json
import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load .env from the api directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set — check apps/api/.env")


# ── Database lifecycle ───────────────────────────────────────────────


@pytest.fixture(scope="session")
def test_engine():
    """Create tables once per session using the shared Postgres DB."""
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)

    from database import Base
    Base.metadata.create_all(bind=engine)

    yield engine

    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Provide a transactional session that rolls back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    # Nested transaction so app code can call session.commit()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with get_db overridden to use test session."""
    from main import app
    from database import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Authenticated clients ────────────────────────────────────────────
# Most routes moved behind JWT + RBAC after these tests were first written.
# Overriding the auth dependencies keeps each test focused on the endpoint's
# own behaviour instead of on token plumbing, while `client` stays anonymous
# so the gates themselves remain testable.


def _authed_client(client, username, role):
    from main import app
    from database import User
    from services.auth import get_current_user, get_optional_user, require_admin

    user = User(
        id=9000 + (1 if role == "admin" else 2),
        username=username,
        role=role,
        hashed_password="not-used",
        is_active=True,
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    if role == "admin":
        app.dependency_overrides[require_admin] = lambda: user
    return client


@pytest.fixture
def admin_client(client):
    """Authenticated as an NSIC officer (role=admin)."""
    return _authed_client(client, "nsic-test@msmemate.com", "admin")


@pytest.fixture
def mse_client(client):
    """Authenticated as an enterprise user (role=mse) — no admin routes."""
    return _authed_client(client, "mse-test@msmemate.com", "mse")


# ── Seed data fixtures ───────────────────────────────────────────────


@pytest.fixture
def seed_domains(db_session):
    """Ensure 5 ONDC domains and sample categories exist.

    Get-or-create, deliberately. Per-test rollback isolates what a test
    *writes*, but it does not give a clean slate: this suite runs against the
    shared Postgres instance, which is already seeded with the real 14-domain
    /408-category taxonomy. A blind INSERT here fails on the unique code
    constraint before the test body ever runs.
    """
    from database import OndcDomain, OndcCategory

    domains_data = [
        ("RET10", "Grocery", "Food and grocery items"),
        ("RET12", "Fashion", "Clothing and textiles"),
        ("RET14", "Electronics", "Consumer electronics"),
        ("RET16", "Home & Kitchen", "Furniture and kitchenware"),
        ("RET18", "Health & Wellness", "Ayurvedic and health products"),
    ]
    domains = []
    for code, name, desc in domains_data:
        d = db_session.query(OndcDomain).filter_by(code=code).first()
        if d is None:
            d = OndcDomain(code=code, name=name, description=desc)
            db_session.add(d)
            db_session.flush()
        domains.append(d)

    by_code = {d.code: d for d in domains}
    categories_data = [
        ("RET10", "RET10-001", "Staples & Grains"),
        ("RET10", "RET10-002", "Spices & Condiments"),
        ("RET12", "RET12-001", "Sarees & Traditional Wear"),
        ("RET14", "RET14-001", "Mobile Phones & Accessories"),
        ("RET16", "RET16-001", "Kitchen Utensils"),
        ("RET18", "RET18-001", "Ayurvedic Medicines"),
    ]
    for domain_code, code, name in categories_data:
        existing = db_session.query(OndcCategory).filter_by(code=code).first()
        if existing is None:
            db_session.add(OndcCategory(
                domain_id=by_code[domain_code].id, code=code, name=name))
    db_session.flush()
    return domains


@pytest.fixture
def seed_mse(db_session):
    """Ensure a single test MSE exists (grocery, Maharashtra).

    Reuses a leftover row with the same Udyam number rather than colliding on
    the unique constraint — see seed_domains for why a clean slate is not a
    safe assumption here.
    """
    from database import MSE

    existing = (
        db_session.query(MSE).filter_by(udyam_number="UDYAM-TEST-001").first()
    )
    if existing is not None:
        return existing

    mse = MSE(
        udyam_number="UDYAM-TEST-001",
        name="Test Spice Traders",
        description="We sell turmeric, cumin, dal, rice and spice powders wholesale",
        district="Pune",
        state="Maharashtra",
        pin_code="411001",
        language="en",
        turnover_band="micro",
        products="Turmeric, Cumin, Spice Powders",
    )
    db_session.add(mse)
    db_session.flush()
    return mse


@pytest.fixture
def seed_snps(db_session):
    """Insert 5 representative SNPs across domains and geographies."""
    from database import SNP

    snps_data = [
        {
            "name": "GroceryMart India",
            "subscriber_id": "snp-test-001",
            "domain_codes": "RET10",
            "geo_coverage": "Pan-India",
            "commission_pct": 4.5,
            "rating": 4.2,
            "onboarding_support": "full",
            "languages_supported": "en,hi",
        },
        {
            "name": "KiranaConnect",
            "subscriber_id": "snp-test-002",
            "domain_codes": "RET10",
            "geo_coverage": "Maharashtra,Gujarat",
            "commission_pct": 3.0,
            "rating": 4.5,
            "onboarding_support": "full",
            "languages_supported": "en,hi,mr",
        },
        {
            "name": "TextileHub",
            "subscriber_id": "snp-test-003",
            "domain_codes": "RET12",
            "geo_coverage": "Pan-India",
            "commission_pct": 5.0,
            "rating": 4.3,
            "onboarding_support": "full",
            "languages_supported": "en,hi",
        },
        {
            "name": "TechBazaar",
            "subscriber_id": "snp-test-004",
            "domain_codes": "RET14",
            "geo_coverage": "Delhi,UP",
            "commission_pct": 4.0,
            "rating": 4.1,
            "onboarding_support": "partial",
            "languages_supported": "en,hi",
        },
        {
            "name": "AyurvedaHub",
            "subscriber_id": "snp-test-005",
            "domain_codes": "RET18",
            "geo_coverage": "Pan-India",
            "commission_pct": 5.0,
            "rating": 4.5,
            "onboarding_support": "full",
            "languages_supported": "en,hi",
        },
    ]
    snps = []
    for data in snps_data:
        snp = (
            db_session.query(SNP)
            .filter_by(subscriber_id=data["subscriber_id"])
            .first()
        )
        if snp is None:
            snp = SNP(**data)
            db_session.add(snp)
        snps.append(snp)
    db_session.flush()
    return snps


@pytest.fixture
def seed_classification(db_session, seed_mse):
    """Insert a classification result for the test MSE."""
    from database import ClassificationResult

    cr = ClassificationResult(
        mse_id=seed_mse.id,
        predicted_domain="RET10",
        confidence=0.72,
        top3_predictions=json.dumps([
            {"domain": "RET10", "confidence": 0.72},
            {"domain": "RET18", "confidence": 0.15},
            {"domain": "RET16", "confidence": 0.08},
        ]),
    )
    db_session.add(cr)
    db_session.flush()
    return cr
