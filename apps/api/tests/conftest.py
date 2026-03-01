"""Test fixtures for AgentMap AI integration tests.

Uses a dedicated PostgreSQL test database (agentmap_test) with per-test
transaction rollback for isolation.
"""

import json
import os

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://agentmap:agentmap_dev@localhost:5432/agentmap_test",
)


# ── Database lifecycle ───────────────────────────────────────────────


@pytest.fixture(scope="session")
def test_engine():
    """Create the agentmap_test database and tables once per session."""
    admin_url = os.getenv(
        "DATABASE_URL",
        "postgresql://agentmap:agentmap_dev@localhost:5432/agentmap",
    )
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        # Terminate existing connections to the test DB
        conn.execute(text(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = 'agentmap_test' AND pid <> pg_backend_pid()"
        ))
        conn.execute(text("DROP DATABASE IF EXISTS agentmap_test"))
        conn.execute(text("CREATE DATABASE agentmap_test"))
    admin_engine.dispose()

    engine = create_engine(TEST_DATABASE_URL)

    from database import Base
    Base.metadata.create_all(bind=engine)

    yield engine

    engine.dispose()

    # Cleanup
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = 'agentmap_test' AND pid <> pg_backend_pid()"
        ))
        conn.execute(text("DROP DATABASE IF EXISTS agentmap_test"))
    admin_engine.dispose()


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


# ── Seed data fixtures ───────────────────────────────────────────────


@pytest.fixture
def seed_domains(db_session):
    """Insert 5 ONDC domains and sample categories."""
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
        d = OndcDomain(code=code, name=name, description=desc)
        db_session.add(d)
        domains.append(d)
    db_session.flush()

    categories_data = [
        (domains[0].id, "RET10-001", "Staples & Grains"),
        (domains[0].id, "RET10-002", "Spices & Condiments"),
        (domains[1].id, "RET12-001", "Sarees & Traditional Wear"),
        (domains[2].id, "RET14-001", "Mobile Phones & Accessories"),
        (domains[3].id, "RET16-001", "Kitchen Utensils"),
        (domains[4].id, "RET18-001", "Ayurvedic Medicines"),
    ]
    for domain_id, code, name in categories_data:
        db_session.add(OndcCategory(domain_id=domain_id, code=code, name=name))
    db_session.flush()
    return domains


@pytest.fixture
def seed_mse(db_session):
    """Insert a single test MSE (grocery, Maharashtra)."""
    from database import MSE

    mse = MSE(
        udyam_number="UDYAM-TEST-001",
        name="Test Spice Traders",
        description="We sell turmeric, cumin, dal, rice and spice powders wholesale",
        district="Pune",
        state="Maharashtra",
        pin_code="411001",
        language="en",
        gender_owner="male",
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
