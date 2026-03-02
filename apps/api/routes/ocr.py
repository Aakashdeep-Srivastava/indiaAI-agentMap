"""OCR route for document field extraction (Module 1 — Sathi)."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from database import AuditLog, get_db
from services.ocr import extract_from_document

router = APIRouter()


@router.post("/extract")
async def extract(
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    """Extract fields from an uploaded document image/PDF using Sarvam Vision (mock for PoC)."""
    file_bytes = await file.read()
    filename = file.filename or "document.jpg"

    result = await extract_from_document(file_bytes, filename, language)

    db.add(AuditLog(
        action="ocr_extract",
        entity_type="ocr",
        details=f"file={filename} lang={language} engine={result['engine']} type={result['document_type']} conf={result['confidence']}",
        performed_by="system",
    ))
    db.commit()

    return result
