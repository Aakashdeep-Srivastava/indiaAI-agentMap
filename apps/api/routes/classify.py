"""Classification route – VargBot ONDC domain prediction (LLM-powered)."""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (MSE, AuditLog, ClassificationResult, OndcCategory,
                      OndcDomain, User, get_db)
from services.auth import require_admin
from services.classifier import classify_mse_description_async, get_compliance_checklist
from services.notifications import classification_complete, safe_notify

router = APIRouter()

# Real ONDC demand signal (129K+ order lines from AIKosh transaction data)
_DEMAND: dict = {}
try:
    _demand_file = Path(__file__).resolve().parent.parent / "data" / "category_demand.json"
    _DEMAND = json.loads(_demand_file.read_text()).get("domains", {})
except Exception:
    pass


def _demand_for(domain: str) -> Optional[dict]:
    d = _DEMAND.get(domain)
    if not d:
        return None
    return {
        "level": d["level"],
        "orders_observed": d["orders"],
        "note": (
            f"Based on {d['orders']:,} real ONDC order lines in this category "
            f"(AIKosh transaction data)."
        ),
    }


# ── Pydantic models ─────────────────────────────────────────────────


class ClassifyRequest(BaseModel):
    mse_id: int


class ClassifyTextRequest(BaseModel):
    description: str
    language: str = "en"


class PredictionItem(BaseModel):
    domain: str
    confidence: float
    category: Optional[str] = None
    category_name: Optional[str] = None
    explanation: Optional[str] = None


class ComplianceItem(BaseModel):
    name: str
    note: str
    status: str  # "done" | "action"


class ClassifyResponse(BaseModel):
    mse_id: int
    top3: list[PredictionItem]
    selected_domain: str
    confidence: float
    selected_category: Optional[str] = None
    selected_category_name: Optional[str] = None
    explanation: Optional[str] = None
    engine: Optional[str] = None
    # Sectoral attributes extracted from the description (PS2: attribute extraction)
    attributes: dict[str, str] = {}
    # Advisory readiness checklist for the predicted domain (PS2: compliance validation)
    compliance: list[ComplianceItem] = []
    # Real ONDC market demand for the predicted domain (AIKosh order data)
    demand: Optional[dict] = None


class ClassificationHistoryItem(BaseModel):
    id: int
    predicted_domain: str
    confidence: float
    top3_predictions: list[PredictionItem] | None
    model_version: str | None
    created_at: datetime


# ── Routes ───────────────────────────────────────────────────────────


@router.post("/", response_model=ClassifyResponse)
async def classify(payload: ClassifyRequest, db: Session = Depends(get_db)):
    """Classify an MSE into ONDC domain(s) using VargBot LLM chain."""
    mse = db.query(MSE).get(payload.mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    predictions, engine, attributes = await classify_mse_description_async(
        mse.description, mse.language
    )

    top_pred = predictions[0]

    result = ClassificationResult(
        mse_id=mse.id,
        predicted_domain=top_pred["domain"],
        predicted_category=top_pred.get("category"),
        confidence=top_pred["confidence"],
        top3_predictions=json.dumps([dict(p) for p in predictions[:3]]),
        model_version=engine,
    )
    db.add(result)
    db.add(AuditLog(
        action="mse_classified",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Predicted {top_pred['domain']} ({top_pred['confidence']:.2f}) via {engine}",
        performed_by=engine,
    ))

    # Tell the owner in their own words. The notification carries the domain's
    # display name and a qualitative band — never the raw score, matching what
    # the UI is allowed to show an MSE user.
    conf = top_pred["confidence"]
    band = "green" if conf >= 0.85 else "yellow" if conf >= 0.60 else "red"
    domain_row = (
        db.query(OndcDomain).filter(OndcDomain.code == top_pred["domain"]).first()
    )
    event, body_en, body_hi = classification_complete(
        domain_row.name if domain_row else top_pred["domain"], band)
    safe_notify(db, mse.id, event, body_en=body_en, body_hi=body_hi)

    db.commit()

    return ClassifyResponse(
        mse_id=mse.id,
        top3=[PredictionItem(**p) for p in predictions[:3]],
        selected_domain=top_pred["domain"],
        confidence=top_pred["confidence"],
        selected_category=top_pred.get("category"),
        selected_category_name=top_pred.get("category_name"),
        explanation=top_pred.get("explanation"),
        engine=engine,
        attributes=attributes,
        compliance=[
            ComplianceItem(**c)
            for c in get_compliance_checklist(
                top_pred["domain"],
                has_gst=bool(mse.gst_number),
                has_pan=bool(mse.pan_number),
            )
        ],
        demand=_demand_for(top_pred["domain"]),
    )


@router.post("/text", response_model=ClassifyResponse)
async def classify_text(payload: ClassifyTextRequest):
    """Classify raw description text without requiring an MSE record."""
    if not payload.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    predictions, engine, attributes = await classify_mse_description_async(
        payload.description, payload.language
    )

    top_pred = predictions[0]

    return ClassifyResponse(
        mse_id=0,
        top3=[PredictionItem(**p) for p in predictions[:3]],
        selected_domain=top_pred["domain"],
        confidence=top_pred["confidence"],
        selected_category=top_pred.get("category"),
        selected_category_name=top_pred.get("category_name"),
        explanation=top_pred.get("explanation"),
        engine=engine,
        attributes=attributes,
        compliance=[
            ComplianceItem(**c)
            for c in get_compliance_checklist(top_pred["domain"])
        ],
        demand=_demand_for(top_pred["domain"]),
    )


@router.get("/history/{mse_id}", response_model=list[ClassificationHistoryItem])
def classify_history(mse_id: int, db: Session = Depends(get_db)):
    """Return classification history for an MSE, newest first (limit 20)."""
    mse = db.query(MSE).get(mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    rows = (
        db.query(ClassificationResult)
        .filter(ClassificationResult.mse_id == mse_id)
        .order_by(ClassificationResult.created_at.desc())
        .limit(20)
        .all()
    )

    items = []
    for r in rows:
        top3 = None
        if r.top3_predictions:
            try:
                top3 = [PredictionItem(**p) for p in json.loads(r.top3_predictions)]
            except (json.JSONDecodeError, TypeError):
                top3 = None

        items.append(ClassificationHistoryItem(
            id=r.id,
            predicted_domain=r.predicted_domain,
            confidence=r.confidence,
            top3_predictions=top3,
            model_version=r.model_version,
            created_at=r.created_at,
        ))

    return items


class VerifyRequest(BaseModel):
    verdict: str                        # "confirmed" | "corrected"
    domain: Optional[str] = None        # required when correcting
    category: Optional[str] = None      # leaf code — the label nothing else captures
    note: Optional[str] = None


class VerifyResponse(BaseModel):
    result_id: int
    mse_id: int
    predicted_domain: str
    predicted_category: Optional[str]
    officer_verdict: str
    officer_domain: str
    officer_category: Optional[str]
    corrected_by: str
    corrected_at: datetime


@router.post("/{result_id}/verify", response_model=VerifyResponse)
def verify_classification(
    result_id: int,
    payload: VerifyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """NSIC officer verdict on a stored prediction — the ground-truth capture.

    The officer is the authority on what an enterprise actually sells, so their
    verdict is the only real label this system can produce. Confirming stores
    the prediction as correct; correcting stores what it should have been,
    including the leaf category — which no evaluation has ever had.

    Codes are validated against the live taxonomy so a typo cannot silently
    poison the training corpus downstream.
    """
    if payload.verdict not in ("confirmed", "corrected"):
        raise HTTPException(
            status_code=422, detail="verdict must be confirmed or corrected")

    result = db.query(ClassificationResult).get(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")

    if payload.verdict == "confirmed":
        # Store the prediction as the label so gold rows read uniformly and
        # consumers never have to branch on verdict to find the answer.
        officer_domain = result.predicted_domain
        officer_category = result.predicted_category
    else:
        if not payload.domain:
            raise HTTPException(
                status_code=422,
                detail="domain is required when verdict is corrected")
        domain = (
            db.query(OndcDomain)
            .filter(OndcDomain.code == payload.domain)
            .first()
        )
        if not domain:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown ONDC domain code: {payload.domain}")

        officer_domain = domain.code
        officer_category = None
        if payload.category:
            category = (
                db.query(OndcCategory)
                .filter(OndcCategory.code == payload.category)
                .first()
            )
            if not category:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unknown ONDC category code: {payload.category}")
            if category.domain_id != domain.id:
                raise HTTPException(
                    status_code=422,
                    detail=(f"Category {category.code} does not belong to "
                            f"domain {domain.code}"))
            officer_category = category.code

    result.officer_verdict = payload.verdict
    result.officer_domain = officer_domain
    result.officer_category = officer_category
    result.officer_note = payload.note
    result.corrected_by = user.username
    result.corrected_at = datetime.utcnow()

    db.add(AuditLog(
        action=f"classification_{payload.verdict}",
        entity_type="classification_result",
        entity_id=result.id,
        details=(f"Officer {payload.verdict}: predicted "
                 f"{result.predicted_domain}/{result.predicted_category or '-'} "
                 f"→ {officer_domain}/{officer_category or '-'}"
                 + (f" — {payload.note}" if payload.note else "")),
        performed_by=user.username,
    ))
    db.commit()
    db.refresh(result)

    return VerifyResponse(
        result_id=result.id,
        mse_id=result.mse_id,
        predicted_domain=result.predicted_domain,
        predicted_category=result.predicted_category,
        officer_verdict=result.officer_verdict,
        officer_domain=result.officer_domain,
        officer_category=result.officer_category,
        corrected_by=result.corrected_by,
        corrected_at=result.corrected_at,
    )
