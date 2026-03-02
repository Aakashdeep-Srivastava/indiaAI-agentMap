"""NER extraction route — extracts MSE fields from free-form text."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import AuditLog, get_db
from services.ner import extract_fields_llm

router = APIRouter()


class NERRequest(BaseModel):
    text: str
    language: str = "auto"
    existing_fields: dict = {}  # fields already filled (skip these)


class NERResponse(BaseModel):
    extracted: dict
    engine: str  # "sarvam-m" or "regex"
    field_count: int
    remaining_today: int


@router.post("/extract", response_model=NERResponse)
async def extract_fields(req: NERRequest, db: Session = Depends(get_db)):
    """Extract MSE registration fields from free-form text using Sarvam-m LLM."""
    import os
    from services.ner import _limiter

    extracted = await extract_fields_llm(req.text)

    # Remove fields that are already filled
    for key in req.existing_fields:
        if req.existing_fields[key] and key in extracted:
            del extracted[key]

    engine = "sarvam-m" if os.getenv("SARVAM_API_KEY") else "regex"

    # Audit log
    db.add(AuditLog(
        action="ner_extract",
        entity_type="mse",
        details=f"engine={engine}, fields={list(extracted.keys())}, lang={req.language}",
        performed_by="sathi",
    ))
    db.commit()

    return NERResponse(
        extracted=extracted,
        engine=engine,
        field_count=len(extracted),
        remaining_today=_limiter.remaining_today,
    )
