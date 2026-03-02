"""TTS route for voice synthesis (Module 1 — Sathi)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import AuditLog, get_db
from services.tts import synthesize_speech

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@router.post("/synthesize")
async def synthesize(
    req: TTSRequest,
    db: Session = Depends(get_db),
):
    """Synthesize speech from text using Sarvam Bulbul V3 (mock for PoC)."""
    result = await synthesize_speech(req.text, req.language)

    db.add(AuditLog(
        action="tts_synthesize",
        entity_type="tts",
        details=f"lang={req.language} engine={result['engine']} chars={len(req.text)}",
        performed_by="system",
    ))
    db.commit()

    return result
