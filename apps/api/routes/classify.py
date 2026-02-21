"""Classification route – MuRIL-based ONDC domain prediction."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import MSE, AuditLog, ClassificationResult, get_db
from services.classifier import classify_mse_description

router = APIRouter()


class ClassifyRequest(BaseModel):
    mse_id: int


class PredictionItem(BaseModel):
    domain: str
    confidence: float


class ClassifyResponse(BaseModel):
    mse_id: int
    top3: list[PredictionItem]
    selected_domain: str
    confidence: float


@router.post("/", response_model=ClassifyResponse)
def classify(payload: ClassifyRequest, db: Session = Depends(get_db)):
    """Classify an MSE into ONDC domain(s) using MuRIL."""
    mse = db.query(MSE).get(payload.mse_id)
    if not mse:
        raise HTTPException(status_code=404, detail="MSE not found")

    predictions = classify_mse_description(mse.description, mse.language)

    result = ClassificationResult(
        mse_id=mse.id,
        predicted_domain=predictions[0]["domain"],
        confidence=predictions[0]["confidence"],
        top3_predictions=json.dumps(predictions[:3]),
    )
    db.add(result)
    db.add(AuditLog(
        action="mse_classified",
        entity_type="mse",
        entity_id=mse.id,
        details=f"Predicted {predictions[0]['domain']} ({predictions[0]['confidence']:.2f})",
        performed_by="muril-v1-lora",
    ))
    db.commit()

    return ClassifyResponse(
        mse_id=mse.id,
        top3=[PredictionItem(**p) for p in predictions[:3]],
        selected_domain=predictions[0]["domain"],
        confidence=predictions[0]["confidence"],
    )
