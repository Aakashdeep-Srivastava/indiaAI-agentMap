"""OCR service — Sarvam Vision 3B (mock for PoC)."""

import os
import random

USE_MOCK_OCR = os.getenv("USE_MOCK_OCR", "true").lower() == "true"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Realistic MSE certificate data for mock responses
_MOCK_UDYAM_CERTS = [
    {
        "udyam_number": "UDYAM-MH-02-0012345",
        "name": "Sharma Handloom Industries",
        "state": "Maharashtra",
        "district": "Pune",
        "pin_code": "411001",
    },
    {
        "udyam_number": "UDYAM-UP-07-0098765",
        "name": "Gupta Spice Trading Company",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "pin_code": "226001",
    },
    {
        "udyam_number": "UDYAM-KA-12-0054321",
        "name": "Lakshmi Silk Emporium",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "pin_code": "560001",
    },
    {
        "udyam_number": "UDYAM-TN-33-0067890",
        "name": "Rajesh Pottery Works",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "pin_code": "600001",
    },
    {
        "udyam_number": "UDYAM-GJ-24-0011223",
        "name": "Bharat Organic Farms",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "pin_code": "380001",
    },
]

_MOCK_GST_CERTS = [
    {"name": "Sharma Handloom Industries", "state": "Maharashtra", "pin_code": "411001"},
    {"name": "Gupta Spice Trading Company", "state": "Uttar Pradesh", "pin_code": "226001"},
]


def _detect_doc_type(filename: str) -> str:
    """Guess document type from filename."""
    lower = filename.lower()
    if "gst" in lower:
        return "gst_certificate"
    if "pan" in lower:
        return "pan_card"
    return "udyam_certificate"


async def extract_from_document(
    file_bytes: bytes,
    filename: str,
    language: str = "en",
) -> dict:
    """Extract fields from a document image/PDF. Mock for PoC, Sarvam Vision in production."""
    if USE_MOCK_OCR or not SARVAM_API_KEY:
        return _extract_mock(filename)
    return await _extract_sarvam(file_bytes, filename, language)


def _extract_mock(filename: str) -> dict:
    """Return realistic mock OCR extraction."""
    doc_type = _detect_doc_type(filename)

    if doc_type == "gst_certificate":
        fields = random.choice(_MOCK_GST_CERTS)
    else:
        fields = random.choice(_MOCK_UDYAM_CERTS)

    return {
        "extracted_fields": fields,
        "document_type": doc_type,
        "confidence": round(random.uniform(0.85, 0.96), 2),
        "engine": "mock",
        "is_mock": True,
    }


async def _extract_sarvam(
    file_bytes: bytes,
    filename: str,
    language: str,
) -> dict:
    """Call Sarvam Vision 3B API (production path)."""
    import httpx

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/vision/extract",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": (filename, file_bytes, "image/jpeg")},
            data={"language": language, "doc_type": "business_certificate"},
        )
        resp.raise_for_status()
        result = resp.json()

    return {
        "extracted_fields": result.get("fields", {}),
        "document_type": result.get("document_type", "unknown"),
        "confidence": result.get("confidence", 0.0),
        "engine": "sarvam-vision-3b",
        "is_mock": False,
    }
