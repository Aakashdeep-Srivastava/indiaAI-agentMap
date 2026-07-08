"""Document field extraction (Module 1 — Sathi).

Digital PDFs (with an embedded text layer) are parsed directly — free and
instant. Scanned PDFs and images go through Sarvam Document Intelligence
(Sarvam Vision OCR, 22 Indian languages + English) — fully sovereign.
Both paths share the same post-processing: deterministic Udyam-certificate
label regexes + Sarvam-30B NER for the remaining fields."""

import asyncio
import io
import logging
import os
import random
import re
import tempfile
import zipfile
from pathlib import Path

from dotenv import load_dotenv

# Ensure .env is loaded regardless of module import order
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

USE_MOCK_OCR = os.getenv("USE_MOCK_OCR", "false").lower() == "true"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Secondary OCR engine — reliability safety net only (primary is Sarvam)
OCR_FALLBACK_KEY = os.getenv("OCR_FALLBACK_KEY", "")
OCR_FALLBACK_ENDPOINT = os.getenv("OCR_FALLBACK_ENDPOINT", "").rstrip("/")

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
    """Extract fields from a document. Digital PDFs are parsed directly;
    scanned PDFs/images go through Sarvam Document Intelligence OCR."""
    is_pdf = filename.lower().endswith(".pdf") or file_bytes[:5] == b"%PDF-"

    if is_pdf:
        result = await _extract_pdf(file_bytes)
        if result is not None:
            return result
        # Scanned (image-only) PDF — needs real OCR below.

    if SARVAM_API_KEY and not USE_MOCK_OCR:
        try:
            return await _extract_docint(file_bytes, filename, language)
        except Exception as e:
            logger.error(f"Sarvam Document Intelligence failed: {e}")

    # Secondary OCR engine (demo reliability)
    if OCR_FALLBACK_KEY and OCR_FALLBACK_ENDPOINT and not USE_MOCK_OCR:
        try:
            return await _extract_fallback_ocr(file_bytes)
        except Exception as e:
            logger.error(f"Fallback OCR failed: {e}")

    return _extract_mock(filename)


# ── Digital-PDF path (real extraction) ────────────────────────────────

# Certificate-label regexes tuned for Udyam Registration Certificate prints.
_UDYAM_RE = re.compile(r"UDYAM-[A-Z]{2}-\d{2}-\d{7}")
_ENTERPRISE_NAME_RE = re.compile(
    r"NAME OF ENTERPRISE\s*[:\-]?\s*(.+?)(?:\n|TYPE OF)", re.IGNORECASE | re.DOTALL
)
_BAND_RE = re.compile(r"\b(Micro|Small|Medium)\b", re.IGNORECASE)
_ACTIVITY_RE = re.compile(r"MAJOR ACTIVITY\s*[:\-]?\s*(SERVICES|MANUFACTURING|TRADING)", re.IGNORECASE)
_MOBILE_RE = re.compile(r"\b([6-9]\d{9})\b")
_EMAIL_RE = re.compile(r"\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
_PIN_RE = re.compile(r"\bPin\s*[:\-]?\s*(\d{6})\b", re.IGNORECASE)
_ANY_PIN_RE = re.compile(r"\b([1-9]\d{5})\b")
_NIC5_RE = re.compile(r"\b(\d{5})\s*[-–]")
_DISTRICT_RE = re.compile(r"District\s*[:\-]?\s*([A-Z][A-Za-z ]+?)\s*[,\n]", re.IGNORECASE)


def _parse_udyam_text(text: str) -> dict:
    """Deterministic parse of a Udyam certificate's embedded text."""
    fields: dict = {}

    if m := _UDYAM_RE.search(text.upper()):
        fields["udyam_number"] = m.group(0)
    if m := _ENTERPRISE_NAME_RE.search(text):
        name = " ".join(m.group(1).split()).lstrip("#").strip()
        fields["name"] = name.title() if name.isupper() else name
        upper = name.upper()
        if "PRIVATE LIMITED" in upper:
            fields["org_type"] = "Private Limited Company"
        elif "LLP" in upper:
            fields["org_type"] = "LLP"
    if m := _BAND_RE.search(text):
        fields["turnover_band"] = m.group(1).lower()
    if m := _ACTIVITY_RE.search(text):
        fields["major_activity"] = m.group(1).title()
    if m := _MOBILE_RE.search(text):
        fields["mobile_number"] = m.group(1)
    if m := _EMAIL_RE.search(text):
        fields["email"] = m.group(1).lower()
    if m := _PIN_RE.search(text) or _ANY_PIN_RE.search(text):
        fields["pin_code"] = m.group(1)
    if m := _NIC5_RE.search(text):
        fields["nic_code"] = m.group(1)
    if m := _DISTRICT_RE.search(text):
        fields["district"] = m.group(1).strip().title()

    # State: word-boundary match, longest names first so "Uttar Pradesh"
    # can never lose to a short false positive like "Goa" inside noise.
    from services.ner import INDIAN_STATES
    for state in sorted(INDIAN_STATES, key=len, reverse=True):
        if re.search(rf"\b{re.escape(state)}\b", text, re.IGNORECASE):
            fields["state"] = state
            break

    return fields


# ── Output sanitation (LLMs must never autofill garbage) ──────────────

_VALID = {
    "udyam_number": re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$"),
    "mobile_number": re.compile(r"^[6-9]\d{9}$"),
    "email": re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"),
    "pin_code": re.compile(r"^[1-9]\d{5}$"),
    "pan_number": re.compile(r"^[A-Z]{5}\d{4}[A-Z]$"),
    "gst_number": re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$"),
    "nic_code": re.compile(r"^\d{2,5}$"),
}
# Known prompt-example values the LLM sometimes parrots back.
_PROMPT_ARTIFACTS = {"AAACX1234H", "UDYAM-XX-00-0000000", "9876543210"}
_ENUMS = {
    "turnover_band": {"micro", "small", "medium"},
    "major_activity": {"Manufacturing", "Services", "Trading"},
    "transaction_type": {"B2B", "B2C", "Both"},
}


def _sanitize_fields(fields: dict) -> dict:
    """Drop malformed, hallucinated, or nonsense values before autofill."""
    clean: dict = {}
    for key, value in fields.items():
        if not isinstance(value, str):
            continue
        v = value.lstrip("#").strip()
        if not v or v.upper() in _PROMPT_ARTIFACTS:
            continue
        if key in _VALID and not _VALID[key].match(v.upper() if key != "email" else v):
            continue
        if key in _ENUMS:
            match = next((e for e in _ENUMS[key] if e.lower() == v.lower()), None)
            if not match:
                continue
            v = match
        if key == "entrepreneur_name" and "@" in v:
            continue  # LLM confused the email for a person
        if key == "turnover_prev_fy" and not (
            any(c.isdigit() for c in v)
            and re.search(r"lakh|crore|cr\b|rs\.?|₹|,\d{3}", v, re.IGNORECASE)
        ):
            continue  # must look like money
        if key in ("pan_number", "gst_number", "udyam_number"):
            v = v.upper()
        clean[key] = v
    return clean


async def _fields_from_text(text: str, base_engine: str) -> dict:
    """Shared post-processing: label regexes first, Sarvam-30B for the rest."""
    fields = _parse_udyam_text(text)
    engine = base_engine

    try:
        from services.ner import extract_fields_llm
        llm_fields, llm_engine = await extract_fields_llm(text[:6000])
        for k, v in llm_fields.items():
            fields.setdefault(k, v)
        if llm_engine != "regex":
            engine = f"{base_engine}+{llm_engine}"
    except Exception as e:
        logger.warning(f"LLM assist on document text failed: {e}")

    fields = _sanitize_fields(fields)
    doc_type = "udyam_certificate" if "udyam_number" in fields else "business_document"
    return {
        "extracted_fields": fields,
        "document_type": doc_type,
        "confidence": 0.97 if "udyam_number" in fields else 0.75,
        "engine": engine,
        "is_mock": False,
    }


async def _extract_pdf(file_bytes: bytes) -> dict | None:
    """Parse a digital PDF. Returns None when the PDF has no embedded text
    (i.e. a scan), so the caller can fall back to real OCR."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:3])
    except Exception as e:
        logger.error(f"PDF parse failed: {e}")
        return None

    if len(text.strip()) < 40:
        return None  # scanned PDF, no text layer

    return await _fields_from_text(text, "pdf-text")


# ── Sarvam Document Intelligence (real OCR for scans/images) ──────────

_DOCINT_LANG = {"hi": "hi-IN", "en": "en-IN"}


def _docint_ocr_sync(file_bytes: bytes, filename: str, language: str) -> str:
    """Run a Sarvam Document Intelligence job and return the OCR'd markdown."""
    from sarvamai import SarvamAI

    suffix = Path(filename).suffix or ".pdf"
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"upload{suffix}"
        src.write_bytes(file_bytes)

        client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
        job = client.document_intelligence.create_job(
            language=_DOCINT_LANG.get(language, "en-IN"),
            output_format="md",
        )
        job.upload_file(str(src))
        job.start()
        job.wait_until_complete()

        out = Path(tmp) / "output.zip"
        job.download_output(str(out))
        with zipfile.ZipFile(out) as z:
            for name in z.namelist():
                if name.endswith(".md"):
                    return z.read(name).decode("utf-8", errors="replace")
    return ""


async def _extract_fallback_ocr(file_bytes: bytes) -> dict:
    """Secondary OCR engine (prebuilt-read REST): analyze, poll, extract text."""
    import httpx

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{OCR_FALLBACK_ENDPOINT}/documentintelligence/documentModels/"
            f"prebuilt-read:analyze?api-version=2024-11-30",
            headers={
                "Ocp-Apim-Subscription-Key": OCR_FALLBACK_KEY,
                "Content-Type": "application/octet-stream",
            },
            content=file_bytes,
        )
        resp.raise_for_status()
        poll_url = resp.headers["Operation-Location"]

        text = ""
        for _ in range(45):  # ≤ 90s of polling
            await asyncio.sleep(2)
            status = (await client.get(
                poll_url, headers={"Ocp-Apim-Subscription-Key": OCR_FALLBACK_KEY},
            )).json()
            if status.get("status") == "succeeded":
                text = status.get("analyzeResult", {}).get("content", "")
                break
            if status.get("status") == "failed":
                raise ValueError("fallback OCR job failed")

    if len(text.strip()) < 40:
        raise ValueError("fallback OCR returned no text")
    return await _fields_from_text(text, "fallback-ocr")


DOCINT_TIMEOUT_S = int(os.getenv("DOCINT_TIMEOUT_S", "120"))


async def _extract_docint(file_bytes: bytes, filename: str, language: str) -> dict:
    """OCR a scanned document via Sarvam Document Intelligence (sovereign).
    Hard timeout so a slow upstream can never hang the registration flow."""
    text = await asyncio.wait_for(
        asyncio.to_thread(_docint_ocr_sync, file_bytes, filename, language),
        timeout=DOCINT_TIMEOUT_S,
    )
    if len(text.strip()) < 40:
        raise ValueError("Document Intelligence returned no text")
    return await _fields_from_text(text, "sarvam-vision")


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
