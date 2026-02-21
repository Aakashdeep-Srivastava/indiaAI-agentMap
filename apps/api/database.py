"""SQLAlchemy models and database setup for AgentMap AI."""

import os
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://agentmap:agentmap_dev@localhost:5432/agentmap"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


# ── ONDC Taxonomy ──────────────────────────────────────────────────────

class OndcDomain(Base):
    __tablename__ = "ondc_domains"

    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)  # e.g. "RET10"
    name = Column(String(200), nullable=False)
    description = Column(Text)

    categories = relationship("OndcCategory", back_populates="domain")


class OndcCategory(Base):
    __tablename__ = "ondc_categories"

    id = Column(Integer, primary_key=True)
    domain_id = Column(Integer, ForeignKey("ondc_domains.id"), nullable=False)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(300), nullable=False)

    domain = relationship("OndcDomain", back_populates="categories")


# ── MSE (Micro/Small Enterprise) ──────────────────────────────────────

class MSE(Base):
    __tablename__ = "mses"

    id = Column(Integer, primary_key=True)
    udyam_number = Column(String(30), unique=True, nullable=False)
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    district = Column(String(100))
    state = Column(String(100))
    pin_code = Column(String(10))
    nic_code = Column(String(10))
    language = Column(String(10), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)

    classifications = relationship("ClassificationResult", back_populates="mse")
    matches = relationship("MatchResult", back_populates="mse")


# ── SNP (Seller Network Participant) ──────────────────────────────────

class SNP(Base):
    __tablename__ = "snps"

    id = Column(Integer, primary_key=True)
    name = Column(String(300), nullable=False)
    subscriber_id = Column(String(100), unique=True, nullable=False)
    domain_codes = Column(String(200))  # comma-separated ONDC domain codes
    geo_coverage = Column(String(500))  # comma-separated state/district
    commission_pct = Column(Float, default=0.0)
    min_order_value = Column(Float, default=0.0)
    languages_supported = Column(String(200), default="en,hi")
    rating = Column(Float, default=0.0)
    onboarding_support = Column(
        Enum("full", "partial", "none", name="support_level"), default="partial"
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    matches = relationship("MatchResult", back_populates="snp")


# ── Classification (MuRIL output) ─────────────────────────────────────

class ClassificationResult(Base):
    __tablename__ = "classification_results"

    id = Column(Integer, primary_key=True)
    mse_id = Column(Integer, ForeignKey("mses.id"), nullable=False)
    predicted_domain = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False)
    top3_predictions = Column(Text)  # JSON string of top-3
    model_version = Column(String(50), default="muril-v1-lora")
    created_at = Column(DateTime, default=datetime.utcnow)

    mse = relationship("MSE", back_populates="classifications")


# ── Match Result (IndicBERT scoring) ──────────────────────────────────

class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True)
    mse_id = Column(Integer, ForeignKey("mses.id"), nullable=False)
    snp_id = Column(Integer, ForeignKey("snps.id"), nullable=False)
    composite_score = Column(Float, nullable=False)

    # Factor breakdown
    domain_score = Column(Float, default=0.0)       # D – 0.35 weight
    geo_score = Column(Float, default=0.0)           # G – 0.20 weight
    commission_score = Column(Float, default=0.0)    # C – 0.15 weight
    history_score = Column(Float, default=0.0)       # H – 0.20 weight
    sentiment_score = Column(Float, default=0.0)     # S – 0.10 weight

    confidence_band = Column(
        Enum("green", "yellow", "red", name="confidence_band"), nullable=False
    )
    explainer_en = Column(Text)
    explainer_hi = Column(Text)
    model_version = Column(String(50), default="indicbert-v1")
    created_at = Column(DateTime, default=datetime.utcnow)

    mse = relationship("MSE", back_populates="matches")
    snp = relationship("SNP", back_populates="matches")


# ── Audit Trail ───────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    details = Column(Text)
    performed_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Dependency injection ──────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
