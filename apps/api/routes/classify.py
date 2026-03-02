"""Classification route – VargBot ONDC domain prediction (LLM-powered)."""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, AuditLog, ClassificationResult, get_db
from services.classifier import classify_mse_description_async

router = APIRouter()


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


class ClassifyResponse(BaseModel):
    mse_id: int
    top3: list[PredictionItem]
    selected_domain: str
    confidence: float
    selected_category: Optional[str] = None
    selected_category_name: Optional[str] = None
    explanation: Optional[str] = None
    engine: Optional[str] = None


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

    predictions, engine = await classify_mse_description_async(mse.description, mse.language)

    top_pred = predictions[0]

    result = ClassificationResult(
        mse_id=mse.id,
        predicted_domain=top_pred["domain"],
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
    )


@router.post("/text", response_model=ClassifyResponse)
async def classify_text(payload: ClassifyTextRequest):
    """Classify raw description text without requiring an MSE record."""
    if not payload.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    predictions, engine = await classify_mse_description_async(payload.description, payload.language)

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
