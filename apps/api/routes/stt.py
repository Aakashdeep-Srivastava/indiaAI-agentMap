"""Speech-to-Text route for voice input (Module 1 — Sathi)."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from database import AuditLog, get_db
from services.stt import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("en"),
    field_hint: str = Form("description"),
    db: Session = Depends(get_db),
):
    """Transcribe an audio file to text using Sarvam Saras STT (mock for PoC)."""
    audio_bytes = await file.read()
    filename = file.filename or "audio.webm"
    content_type = file.content_type or "audio/webm"

    result = await transcribe_audio(audio_bytes, language, field_hint, filename, content_type)

    db.add(AuditLog(
        action="stt_transcribe",
        entity_type="stt",
        details=f"lang={language} field={field_hint} engine={result['engine']} conf={result['confidence']}",
        performed_by="system",
    ))
    db.commit()

    return result
