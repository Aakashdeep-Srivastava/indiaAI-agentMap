"""NER / Structured Field Extraction using Sarvam-m (FREE LLM API).

Extracts MSE registration fields from free-form multilingual text
(Hindi, English, code-mixed) via Sarvam AI's chat completion API.
Falls back to regex if the API is unavailable.

Rate limiting: max 10 LLM calls/minute, 200/day to protect credits.
"""

import json
import os
import re
import logging
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
import httpx

# Ensure .env is loaded before reading keys
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL = "qwen/qwen3.5-397b-a17b"

from services.gemini_limiter import gemini_limiter

_ner_chain = []
if GEMINI_API_KEY:
    _ner_chain.append("Gemini")
if NVIDIA_API_KEY:
    _ner_chain.append("NVIDIA/Qwen")
if SARVAM_API_KEY:
    _ner_chain.append("Sarvam-m")
_ner_chain.append("REGEX")
logger.info(f"NER chain: {' → '.join(_ner_chain)}")

# ── Rate limiter ─────────────────────────────────────────────────────

MAX_RPM = 30          # max requests per minute
MAX_DAILY = 1000      # max requests per day
MIN_TEXT_LEN = 3      # skip LLM for very short inputs


class _RateLimiter:
    """Simple in-memory rate limiter for Sarvam API calls."""

    def __init__(self):
        self._minute_calls: list[float] = []
        self._day_start: float = time.time()
        self._day_count: int = 0

    def _prune_minute(self):
        now = time.time()
        self._minute_calls = [t for t in self._minute_calls if now - t < 60]

    def _check_day_reset(self):
        now = time.time()
        if now - self._day_start >= 86400:
            self._day_start = now
            self._day_count = 0

    def can_call(self) -> bool:
        self._prune_minute()
        self._check_day_reset()
        return len(self._minute_calls) < MAX_RPM and self._day_count < MAX_DAILY

    def record_call(self):
        self._minute_calls.append(time.time())
        self._day_count += 1

    @property
    def remaining_today(self) -> int:
        self._check_day_reset()
        return max(0, MAX_DAILY - self._day_count)

    @property
    def calls_today(self) -> int:
        self._check_day_reset()
        return self._day_count


_limiter = _RateLimiter()

SYSTEM_PROMPT = """You are a data extraction assistant for Indian MSE (Micro/Small Enterprise) registration.

Extract ALL possible business registration fields from the user's text. The text may be in Hindi, English, Hinglish (code-mixed), or transliterated Hindi in Roman script. The text may come from voice transcription (STT) and contain spoken numbers, spelling errors, or informal language.

Return ONLY a valid JSON object with these fields. Use null for any field not clearly present or inferable:

{
  "name": "business/enterprise name (string or null)",
  "udyam_number": "Udyam registration number in format UDYAM-XX-00-0000000 (string or null)",
  "mobile_number": "10-digit Indian mobile number starting with 6-9, digits only (string or null)",
  "description": "brief English description of what the business does (string or null)",
  "state": "Indian state name in English (string or null)",
  "district": "city or district name in English (string or null)",
  "pin_code": "6-digit Indian postal PIN code (string or null)",
  "products": "comma-separated list of products/services in English (string or null)",
  "turnover_band": "micro, small, or medium based on context (string or null)"
}

Rules:
- Extract ALL fields you can identify — numbers, names, locations, everything
- Translate Hindi/regional field values to English in the output
- For "description", write a concise English summary of the business even if input is in Hindi
- For "products", list individual items comma-separated in English
- For "state", always use the full English state name (e.g., "Uttar Pradesh" not "UP")
- For "name", preserve the original business name as-is (don't translate brand names)
- For "mobile_number", extract digits only (no +91 prefix, no spaces, no dashes). Convert spoken numbers: "nine eight seven six" → "9876"
- For "udyam_number", normalize to UDYAM-XX-00-0000000 format. Handle spoken dashes ("dash", "hyphen") and spaces
- For "pin_code", extract exactly 6 digits. Convert spoken numbers: "two two one zero zero one" → "221001"
- Infer location when clearly implied: "Banarasi" → district: "Varanasi", state: "Uttar Pradesh". "Kanjeevaram" → district: "Kanchipuram", state: "Tamil Nadu". "Lucknawi" → district: "Lucknow", state: "Uttar Pradesh"
- Convert Hindi number words to digits: शून्य=0, एक=1, दो=2, तीन=3, चार=4, पांच=5, छह=6, सात=7, आठ=8, नौ=9
- Return ONLY the JSON object, no explanation or markdown"""


# ── Regex fallback (improved from original) ──────────────────────────

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
]

STATE_ABBREVS = {
    "UP": "Uttar Pradesh", "MP": "Madhya Pradesh", "AP": "Andhra Pradesh",
    "HP": "Himachal Pradesh", "WB": "West Bengal", "TN": "Tamil Nadu",
    "JK": "Jammu & Kashmir", "UK": "Uttarakhand",
}

# Hindi state names → English
HINDI_STATES = {
    "महाराष्ट्र": "Maharashtra", "उत्तर प्रदेश": "Uttar Pradesh",
    "कर्नाटक": "Karnataka", "गुजरात": "Gujarat", "राजस्थान": "Rajasthan",
    "तमिलनाडु": "Tamil Nadu", "केरल": "Kerala", "बिहार": "Bihar",
    "दिल्ली": "Delhi", "पंजाब": "Punjab", "हरियाणा": "Haryana",
    "मध्य प्रदेश": "Madhya Pradesh", "पश्चिम बंगाल": "West Bengal",
    "झारखंड": "Jharkhand", "छत्तीसगढ़": "Chhattisgarh", "उत्तराखंड": "Uttarakhand",
    "ओडिशा": "Odisha", "असम": "Assam", "गोवा": "Goa",
    "तेलंगाना": "Telangana", "आंध्र प्रदेश": "Andhra Pradesh",
}


def _regex_extract(text: str) -> dict:
    """Fast regex-based extraction as fallback."""
    result = {}
    lower = text.lower()

    # Udyam number
    m = re.search(r'UDYAM[-\s]?[A-Z]{2}[-\s]?\d{2}[-\s]?\d{7}', text, re.IGNORECASE)
    if m:
        result["udyam_number"] = m.group(0).upper().replace(" ", "-")

    # Mobile number
    m = re.search(r'\b([6-9]\d{9})\b', text)
    if m:
        result["mobile_number"] = m.group(1)

    # PIN code
    m = re.search(r'\b([1-9]\d{5})\b', text)
    if m:
        result["pin_code"] = m.group(1)

    # State (English)
    for state in INDIAN_STATES:
        if state.lower() in lower:
            result["state"] = state
            break

    # State (abbreviations)
    if "state" not in result:
        for abbr, full in STATE_ABBREVS.items():
            if re.search(rf'\b{abbr}\.?\b', text, re.IGNORECASE):
                result["state"] = full
                break

    # State (Hindi)
    if "state" not in result:
        for hindi, eng in HINDI_STATES.items():
            if hindi in text:
                result["state"] = eng
                break

    # Business name patterns
    name_patterns = [
        r'(?:business|company|shop|enterprise|firm|store|brand)\s+(?:name\s+)?(?:is|called|named)\s+["\']?([A-Z][A-Za-z\s&\'-]{2,50})',
        r'(?:called|named)\s+["\']?([A-Z][A-Za-z\s&\'-]{2,50})',
        r'(?:my|our|mera|hamara)\s+(?:business|company|shop|dukaan|firm)\s+(?:is\s+)?["\']?([A-Z][A-Za-z\s&\'-]{2,50})',
        r'(?:naam|name)\s+(?:hai|is|he)\s+["\']?([^\s][^"\',;\n]{2,50})',
    ]
    for p in name_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            result["name"] = m.group(1).strip().rstrip(".!?")
            break

    # Products
    prod_patterns = [
        r'(?:we\s+(?:make|sell|produce|manufacture|deal\s+in|supply|offer))\s+([^.!?\n]{5,120})',
        r'(?:products?|services?|items?)\s+(?:are|include|like)\s+([^.!?\n]{5,120})',
        r'(?:dealing\s+in|speciali[sz]e\s+in|bechte?\s+(?:hain?|hai))\s+([^.!?\n]{5,120})',
        r'(?:banate?\s+(?:hain?|hai)|banaate?\s+(?:hain?|hai))\s+([^.!?\n]{5,120})',
    ]
    for p in prod_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            result["products"] = m.group(1).strip().rstrip(".!?")
            break

    # Description
    if len(text) > 30:
        result["description"] = text.strip()

    # Turnover
    if re.search(r'\bmicro\b', text, re.IGNORECASE):
        result["turnover_band"] = "micro"
    elif re.search(r'\bsmall\b', text, re.IGNORECASE):
        result["turnover_band"] = "small"
    elif re.search(r'\bmedium\b', text, re.IGNORECASE):
        result["turnover_band"] = "medium"

    return result


def _parse_llm_json(raw: str) -> Optional[dict]:
    """Extract JSON from LLM response, handling markdown fences."""
    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    m = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding first { ... } block
    m = re.search(r'\{[^{}]*\}', raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass

    return None


def _clean_llm_result(parsed: dict) -> dict:
    """Remove null values and strip whitespace from LLM output."""
    cleaned = {}
    for k, v in parsed.items():
        if v is not None and isinstance(v, str) and v.strip():
            cleaned[k] = v.strip()
    return cleaned


async def _extract_gemini(text: str) -> Optional[dict]:
    """Extract fields using Google Gemini API. Tries multiple models with rate limiting."""
    if not GEMINI_API_KEY:
        return None

    for model in GEMINI_MODELS:
        # Check rate limit before calling
        if not await gemini_limiter.acquire(model, max_wait=8.0):
            logger.info(f"Gemini NER {model}: rate limited, trying next model...")
            continue

        try:
            url = f"{GEMINI_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": [
                            {"role": "user", "parts": [{"text": text}]},
                        ],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 512,
                        },
                    },
                )
                if resp.status_code == 429:
                    gemini_limiter.mark_429(model)
                    logger.warning(f"Gemini NER {model} got 429 despite limiter, trying next...")
                    continue
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = _parse_llm_json(content)
                if parsed:
                    logger.info(f"Gemini NER ({model}) extracted {len(parsed)} fields")
                    return _clean_llm_result(parsed)
                logger.warning(f"Gemini {model} returned unparseable JSON")
        except Exception as e:
            logger.error(f"Gemini NER {model} error: {e}")
            continue

    return None


async def _extract_nvidia(text: str) -> Optional[dict]:
    """Extract fields using NVIDIA NIM (Qwen 3.5 397B)."""
    if not NVIDIA_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                NVIDIA_BASE,
                headers={
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": NVIDIA_MODEL,
                    "temperature": 0.1,
                    "max_tokens": 512,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": text},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            # Qwen may wrap thinking in <think> tags — strip them
            content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
            parsed = _parse_llm_json(content)
            if parsed:
                logger.info(f"NVIDIA/Qwen NER extracted {len(parsed)} fields")
                return _clean_llm_result(parsed)
            logger.warning("NVIDIA/Qwen NER: unparseable JSON response")
    except Exception as e:
        logger.error(f"NVIDIA/Qwen NER error: {e}")

    return None


async def _extract_sarvam(text: str) -> Optional[dict]:
    """Extract fields using Sarvam-m chat completion API."""
    if not SARVAM_API_KEY:
        return None
    if not _limiter.can_call():
        logger.warning(f"Sarvam rate limit hit ({_limiter.calls_today}/{MAX_DAILY})")
        return None

    try:
        _limiter.record_call()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {SARVAM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sarvam-m",
                    "temperature": 0.1,
                    "max_tokens": 512,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": text},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = _parse_llm_json(content)
            if parsed:
                logger.info(f"Sarvam-m extracted {len(parsed)} fields")
                return _clean_llm_result(parsed)
            return None
    except Exception as e:
        logger.error(f"Sarvam-m API error: {e}")
        return None


async def extract_fields_llm(text: str) -> dict:
    """Extract fields using LLM chain: Gemini → Sarvam-m → Regex fallback."""

    if len(text.strip()) < MIN_TEXT_LEN:
        logger.info("Text too short for LLM, using regex")
        return _regex_extract(text)

    # 1. Try Gemini (fast, reliable, good with numbers)
    result = await _extract_gemini(text)
    if result:
        return result

    # 2. Try NVIDIA/Qwen
    result = await _extract_nvidia(text)
    if result:
        return result

    # 3. Fallback to Sarvam-m
    result = await _extract_sarvam(text)
    if result:
        return result

    # 4. Last resort: regex
    logger.info("All LLMs failed, using regex fallback")
    return _regex_extract(text)


def extract_fields_sync(text: str) -> dict:
    """Synchronous regex extraction (for non-async contexts)."""
    return _regex_extract(text)
