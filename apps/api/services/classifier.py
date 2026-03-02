"""VargBot — ONDC domain classification service.

LLM classification chain: Gemini → NVIDIA/Qwen → Sarvam-m → MuRIL (if loaded) → keyword fallback.
Supports dual-mode operation:
  - If VARGBOT_MODEL_DIR points to a valid LoRA adapter, loads MuRIL + LoRA
  - Otherwise, uses LLM chain with keyword fallback
"""

import asyncio
import json
import logging
import os
import re
from pathlib import Path
from typing import TypedDict, Optional

from dotenv import load_dotenv
import httpx

# Ensure .env is loaded before reading keys
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from services.gemini_limiter import gemini_limiter

logger = logging.getLogger(__name__)

# ── API keys ─────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL = "qwen/qwen3.5-397b-a17b"

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"

# Log available engines (NVIDIA preferred for classification)
_engines = []
if NVIDIA_API_KEY:
    _engines.append("NVIDIA/Qwen")
if GEMINI_API_KEY:
    _engines.append("Gemini")
if SARVAM_API_KEY:
    _engines.append("Sarvam-m")
_engines.append("keyword")
logger.info(f"VargBot classify chain: {' → '.join(_engines)}")

# ── ONDC Domains (PoC subset – 5 domains) ────────────────────────────

ONDC_DOMAINS: dict[str, list[str]] = {
    "RET10": [  # Grocery
        "grocery", "kirana", "rice", "dal", "flour", "spice", "atta", "oil",
        "sugar", "tea", "masala", "provision", "staple", "grain", "pulse",
    ],
    "RET12": [  # Fashion
        "cloth", "garment", "textile", "saree", "kurta", "fabric", "stitch",
        "tailor", "fashion", "apparel", "dress", "wear", "cotton", "silk",
    ],
    "RET14": [  # Electronics
        "electronic", "mobile", "phone", "computer", "laptop", "repair",
        "electric", "wire", "cable", "led", "bulb", "fan", "appliance",
    ],
    "RET16": [  # Home & Kitchen
        "furniture", "kitchen", "utensil", "steel", "vessel", "wooden",
        "craft", "pottery", "home", "décor", "mat", "basket", "bamboo",
    ],
    "RET18": [  # Health & Wellness
        "ayurved", "herbal", "medicine", "health", "wellness", "organic",
        "yoga", "pharma", "supplement", "honey", "natural", "beauty",
    ],
}

DOMAIN_NAMES: dict[str, str] = {
    "RET10": "Grocery",
    "RET12": "Fashion",
    "RET14": "Electronics",
    "RET16": "Home & Kitchen",
    "RET18": "Health & Wellness",
}

LABEL2ID = {
    "RET10": 0,
    "RET12": 1,
    "RET14": 2,
    "RET16": 3,
    "RET18": 4,
}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}

# ── ONDC Taxonomy for LLM prompt ─────────────────────────────────────

ONDC_TAXONOMY_PROMPT = """ONDC Retail Taxonomy (5 domains, 16 categories):

Domain RET10 — Grocery:
  - RET10-001: Staples & Grains (rice, wheat, dal, flour, atta, pulses, millets)
  - RET10-002: Spices & Condiments (masala, turmeric, chilli, cumin, coriander, pickles)
  - RET10-003: Cooking Oil & Ghee (mustard oil, sunflower oil, coconut oil, ghee, vanaspati)
  - RET10-004: Beverages & Tea (tea, coffee, chai, juices, sherbet)

Domain RET12 — Fashion:
  - RET12-001: Sarees & Traditional Wear (sarees, lehengas, salwar kameez, kurta sets)
  - RET12-002: Menswear (shirts, trousers, kurta pajama, sherwanis)
  - RET12-003: Fabrics & Textiles (cotton fabric, silk, linen, handloom cloth, weaving)

Domain RET14 — Electronics:
  - RET14-001: Mobile Phones & Accessories (smartphones, covers, chargers, earphones)
  - RET14-002: Lighting & Electrical (LED bulbs, fans, wires, cables, switches, MCBs)
  - RET14-003: Computer Peripherals (laptops, keyboards, mouse, printers, RAM, hard drives)

Domain RET16 — Home & Kitchen:
  - RET16-001: Kitchen Utensils (steel vessels, pressure cookers, tawa, kadhai, plates)
  - RET16-002: Furniture (wooden tables, chairs, beds, almirahs, shelves)
  - RET16-003: Handicrafts & Décor (pottery, bamboo crafts, terracotta, wall hangings, mats)

Domain RET18 — Health & Wellness:
  - RET18-001: Ayurvedic Medicines (churna, ras, bhasma, ayurvedic formulations)
  - RET18-002: Organic & Natural Products (organic honey, herbal tea, natural oils, soaps)
  - RET18-003: Yoga & Wellness Accessories (yoga mats, meditation cushions, wellness kits)
"""

CLASSIFY_SYSTEM_PROMPT = f"""You are VargBot, an AI classification engine for India's ONDC (Open Network for Digital Commerce).

Your task: Given a business description (in any Indian language — Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, or code-mixed), classify it into the correct ONDC retail domain and subcategory.

{ONDC_TAXONOMY_PROMPT}

Return ONLY a valid JSON object with exactly this structure:
{{
  "predictions": [
    {{
      "domain": "RET10",
      "domain_name": "Grocery",
      "confidence": 0.85,
      "category": "RET10-002",
      "category_name": "Spices & Condiments",
      "explanation": "The business primarily deals in turmeric and spice trading, which maps directly to the Spices & Condiments category under Grocery."
    }},
    {{
      "domain": "RET18",
      "domain_name": "Health & Wellness",
      "confidence": 0.10,
      "category": "RET18-002",
      "category_name": "Organic & Natural Products",
      "explanation": "Some overlap with organic/natural products if the spices are marketed as organic."
    }},
    {{
      "domain": "RET16",
      "domain_name": "Home & Kitchen",
      "confidence": 0.05,
      "category": null,
      "category_name": null,
      "explanation": "Minimal relevance."
    }}
  ]
}}

Rules:
- Return exactly 3 predictions, ranked by confidence (highest first)
- Confidence values must sum to approximately 1.0
- The top prediction should have high confidence (>0.6) for clear cases
- For ambiguous businesses, distribute confidence more evenly
- "explanation" should be 1-2 sentences in English explaining WHY this domain fits
- Use the exact domain codes (RET10, RET12, RET14, RET16, RET18) and category codes from the taxonomy
- If no subcategory clearly fits, set category and category_name to null
- Translate/understand text in ANY Indian language — Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Hinglish, or mixed
- Return ONLY the JSON, no markdown fences, no explanation outside the JSON"""


# ── Type definitions ──────────────────────────────────────────────────

class Prediction(TypedDict):
    domain: str
    confidence: float


class ClassificationPrediction(TypedDict):
    domain: str
    confidence: float
    category: Optional[str]
    category_name: Optional[str]
    explanation: Optional[str]


# ── MuRIL inference state (populated at startup) ─────────────────────

_muril_model = None
_muril_tokenizer = None
_use_muril = False


def init_classifier():
    """Initialize the classifier — load MuRIL if adapter is available."""
    global _muril_model, _muril_tokenizer, _use_muril

    model_dir = os.getenv("VARGBOT_MODEL_DIR", "")
    adapter_path = Path(model_dir) / "adapter" if model_dir else None

    if adapter_path and adapter_path.exists() and (adapter_path / "adapter_config.json").exists():
        try:
            from peft import PeftModel
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            logger.info(f"Loading MuRIL adapter from {adapter_path}")

            base_model_name = "google/muril-base-cased"

            # Check if adapter_config has base_model_name_or_path
            config_path = adapter_path / "adapter_config.json"
            with open(config_path) as f:
                adapter_config = json.load(f)
            base_model_name = adapter_config.get("base_model_name_or_path", base_model_name)

            _muril_tokenizer = AutoTokenizer.from_pretrained(str(adapter_path))
            base_model = AutoModelForSequenceClassification.from_pretrained(
                base_model_name,
                num_labels=len(LABEL2ID),
                id2label=ID2LABEL,
                label2id=LABEL2ID,
            )
            _muril_model = PeftModel.from_pretrained(base_model, str(adapter_path))
            _muril_model.eval()
            _use_muril = True
            logger.info("MuRIL + LoRA loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load MuRIL adapter: {e}. Falling back to LLM/keyword.")
            _use_muril = False
    else:
        logger.info("No VARGBOT_MODEL_DIR set or adapter not found — using LLM chain + keyword fallback")
        _use_muril = False


# ── JSON parsing ──────────────────────────────────────────────────────

VALID_DOMAINS = set(LABEL2ID.keys())


def _parse_classification_json(raw: str) -> Optional[list[ClassificationPrediction]]:
    """Parse LLM JSON response into predictions. Validates domain codes."""
    # Try direct parse
    parsed = None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        pass

    if not parsed:
        # Try extracting from markdown code block
        m = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if m:
            try:
                parsed = json.loads(m.group(1))
            except json.JSONDecodeError:
                pass

    if not parsed:
        # Try finding first { ... } block (greedy to capture nested)
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except json.JSONDecodeError:
                pass

    if not parsed:
        return None

    # Extract predictions array
    preds_raw = parsed.get("predictions") if isinstance(parsed, dict) else None
    if not preds_raw or not isinstance(preds_raw, list):
        # Maybe the LLM returned an array directly
        if isinstance(parsed, list):
            preds_raw = parsed
        else:
            return None

    results: list[ClassificationPrediction] = []
    for p in preds_raw[:3]:
        if not isinstance(p, dict):
            continue
        domain = p.get("domain", "")
        if domain not in VALID_DOMAINS:
            continue
        results.append(ClassificationPrediction(
            domain=domain,
            confidence=round(float(p.get("confidence", 0.0)), 4),
            category=p.get("category"),
            category_name=p.get("category_name"),
            explanation=p.get("explanation"),
        ))

    if not results:
        return None

    # Ensure we have exactly 3 predictions (pad with remaining domains)
    seen = {r["domain"] for r in results}
    remaining = [d for d in VALID_DOMAINS if d not in seen]
    while len(results) < 3 and remaining:
        d = remaining.pop(0)
        results.append(ClassificationPrediction(
            domain=d,
            confidence=round(0.01, 4),
            category=None,
            category_name=None,
            explanation=None,
        ))

    return results[:3]


# ── LLM engines ───────────────────────────────────────────────────────

async def _classify_with_gemini(description: str) -> Optional[list[ClassificationPrediction]]:
    """Classify using Gemini API. Tries multiple models with rate limiting."""
    if not GEMINI_API_KEY:
        return None

    for model in GEMINI_MODELS:
        if not await gemini_limiter.acquire(model, max_wait=8.0):
            logger.info(f"VargBot Gemini {model}: rate limited, trying next...")
            continue

        try:
            url = f"{GEMINI_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "system_instruction": {"parts": [{"text": CLASSIFY_SYSTEM_PROMPT}]},
                        "contents": [
                            {"role": "user", "parts": [{"text": f"Classify this business:\n\n{description}"}]},
                        ],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 1024,
                        },
                    },
                )
                if resp.status_code == 429:
                    gemini_limiter.mark_429(model)
                    logger.warning(f"VargBot Gemini {model} got 429, trying next...")
                    continue
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                preds = _parse_classification_json(content)
                if preds:
                    logger.info(f"VargBot Gemini ({model}): {preds[0]['domain']} @ {preds[0]['confidence']}")
                    return preds
                logger.warning(f"VargBot Gemini {model}: unparseable JSON response")
        except Exception as e:
            logger.error(f"VargBot Gemini {model} error: {e}")
            continue

    return None


async def _classify_with_nvidia(description: str) -> Optional[list[ClassificationPrediction]]:
    """Classify using NVIDIA NIM (Qwen 3.5 397B). OpenAI-compatible endpoint."""
    if not NVIDIA_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                NVIDIA_BASE,
                headers={
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": NVIDIA_MODEL,
                    "temperature": 0.1,
                    "max_tokens": 1024,
                    "messages": [
                        {"role": "system", "content": CLASSIFY_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Classify this business:\n\n{description}"},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]

            # Qwen may wrap thinking in <think> tags — strip them
            content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()

            preds = _parse_classification_json(content)
            if preds:
                logger.info(f"VargBot NVIDIA/Qwen: {preds[0]['domain']} @ {preds[0]['confidence']}")
                return preds
            logger.warning("VargBot NVIDIA/Qwen: unparseable JSON response")
    except Exception as e:
        logger.error(f"VargBot NVIDIA/Qwen error: {e}")

    return None


async def _classify_with_sarvam(description: str) -> Optional[list[ClassificationPrediction]]:
    """Classify using Sarvam-m chat completion API."""
    if not SARVAM_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {SARVAM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sarvam-m",
                    "temperature": 0.1,
                    "max_tokens": 1024,
                    "messages": [
                        {"role": "system", "content": CLASSIFY_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Classify this business:\n\n{description}"},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            preds = _parse_classification_json(content)
            if preds:
                logger.info(f"VargBot Sarvam-m: {preds[0]['domain']} @ {preds[0]['confidence']}")
                return preds
            logger.warning("VargBot Sarvam-m: unparseable JSON response")
    except Exception as e:
        logger.error(f"VargBot Sarvam-m error: {e}")

    return None


# ── MuRIL inference ───────────────────────────────────────────────────

def _classify_with_muril(description: str) -> list[ClassificationPrediction]:
    """Run MuRIL inference and return top-3 predictions."""
    import torch

    inputs = _muril_tokenizer(
        description,
        truncation=True,
        padding="max_length",
        max_length=128,
        return_tensors="pt",
    )

    with torch.no_grad():
        outputs = _muril_model(**inputs)

    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
    top3_indices = torch.argsort(probs, descending=True)[:3]

    return [
        ClassificationPrediction(
            domain=ID2LABEL[idx.item()],
            confidence=round(probs[idx].item(), 4),
            category=None,
            category_name=None,
            explanation=None,
        )
        for idx in top3_indices
    ]


# ── Keyword fallback ─────────────────────────────────────────────────

def _classify_with_keywords(description: str) -> list[ClassificationPrediction]:
    """Keyword frequency scoring (fallback classifier)."""
    text = description.lower()
    scores: dict[str, float] = {}

    for domain, keywords in ONDC_DOMAINS.items():
        hits = sum(1 for kw in keywords if re.search(rf"\b{kw}", text))
        scores[domain] = hits / len(keywords) if keywords else 0.0

    total = sum(scores.values()) or 1.0
    normalised = {d: s / total for d, s in scores.items()}

    ranked = sorted(normalised.items(), key=lambda x: x[1], reverse=True)

    # Ensure minimum confidence floor for the top prediction
    if ranked[0][1] < 0.10:
        ranked[0] = (ranked[0][0], 0.10)

    return [
        ClassificationPrediction(
            domain=domain,
            confidence=round(conf, 4),
            category=None,
            category_name=None,
            explanation=None,
        )
        for domain, conf in ranked[:3]
    ]


# ── Main classification functions ─────────────────────────────────────

async def classify_mse_description_async(
    description: str, language: str = "en"
) -> tuple[list[ClassificationPrediction], str]:
    """Return (top-3 predictions, engine_name) using LLM chain.

    Chain: NVIDIA/Qwen → Gemini → Sarvam-m → MuRIL (if loaded) → keywords.
    """
    # 1. Try NVIDIA/Qwen (preferred — Qwen 3.5 397B)
    preds = await _classify_with_nvidia(description)
    if preds:
        return preds, "nvidia-qwen"

    # 2. Try Gemini (fallback)
    preds = await _classify_with_gemini(description)
    if preds:
        return preds, "gemini-llm"

    # 3. Try Sarvam-m
    preds = await _classify_with_sarvam(description)
    if preds:
        return preds, "sarvam-llm"

    # 4. Try MuRIL if loaded
    if _use_muril:
        return _classify_with_muril(description), "muril-lora"

    # 5. Keyword fallback
    logger.info("All LLM engines failed, using keyword fallback")
    return _classify_with_keywords(description), "keyword-fallback"


def classify_mse_description(description: str, language: str = "en") -> list[Prediction]:
    """Backward-compatible sync wrapper. Returns basic Prediction list.

    Uses MuRIL if loaded, otherwise falls back to keyword mock.
    Note: Does NOT call LLM engines (use classify_mse_description_async for that).
    """
    if _use_muril:
        preds = _classify_with_muril(description)
    else:
        preds = _classify_with_keywords(description)

    # Convert to basic Prediction type for backward compat
    return [Prediction(domain=p["domain"], confidence=p["confidence"]) for p in preds]
