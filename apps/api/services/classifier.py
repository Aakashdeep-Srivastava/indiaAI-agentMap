"""VargBot — ONDC domain classification service.

Sovereign classification chain: Sarvam-30B → MuRIL (if loaded) → keyword fallback.
Supports dual-mode operation:
  - If VARGBOT_MODEL_DIR points to a valid LoRA adapter, loads MuRIL + LoRA
  - Otherwise, uses the Sarvam LLM with keyword fallback
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

logger = logging.getLogger(__name__)

# ── API keys ─────────────────────────────────────────────────────────

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
SARVAM_CHAT_MODEL = os.getenv("SARVAM_CHAT_MODEL", "sarvam-30b")

_engines = []
if SARVAM_API_KEY:
    _engines.append(SARVAM_CHAT_MODEL)
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

# ── Full taxonomy (loaded from DB at first use) ──────────────────────

_taxonomy_prompt: Optional[str] = None
_valid_domains_full: set[str] = set()
_domain_names_full: dict[str, str] = {}
_category_name_to_code: dict[str, str] = {}   # "domain|lower name" -> code


def _load_taxonomy() -> None:
    """Build the classification prompt from the live DB taxonomy
    (14 domains, 400+ leaf categories) instead of the hardcoded PoC subset."""
    global _taxonomy_prompt, _valid_domains_full, _domain_names_full, _category_name_to_code
    if _taxonomy_prompt is not None:
        return
    try:
        from database import OndcCategory, OndcDomain, SessionLocal
        db = SessionLocal()
        try:
            domains = db.query(OndcDomain).order_by(OndcDomain.code).all()
            cats = db.query(OndcCategory).all()
        finally:
            db.close()

        by_domain: dict[int, list] = {}
        for c in cats:
            by_domain.setdefault(c.domain_id, []).append(c)

        lines = [f"ONDC Retail Taxonomy ({len(domains)} domains):", ""]
        for d in domains:
            _valid_domains_full.add(d.code)
            _domain_names_full[d.code] = d.name
            leaf_names = []
            for c in by_domain.get(d.id, []):
                _category_name_to_code[f"{d.code}|{c.name.strip().lower()}"] = c.code
                leaf_names.append(c.name.strip())
            # Cap the prompt size; the resolver still knows every leaf.
            shown = "; ".join(leaf_names[:30]) or "(general)"
            lines.append(f"{d.code} — {d.name}: {shown}")
        _taxonomy_prompt = "\n".join(lines)
        logger.info(
            f"VargBot taxonomy loaded: {len(domains)} domains, {len(cats)} categories"
        )
    except Exception as e:
        logger.warning(f"Taxonomy load failed ({e}) — using PoC subset")
        _taxonomy_prompt = ONDC_TAXONOMY_PROMPT
        _valid_domains_full = set(LABEL2ID.keys())
        _domain_names_full = dict(DOMAIN_NAMES)


def _resolve_category(domain: str, category_name: Optional[str]) -> Optional[str]:
    """Map an LLM-returned category NAME back to its official code."""
    if not category_name:
        return None
    key = f"{domain}|{category_name.strip().lower()}"
    if key in _category_name_to_code:
        return _category_name_to_code[key]
    # Loose contains-match within the same domain
    needle = category_name.strip().lower()
    for k, code in _category_name_to_code.items():
        d, name = k.split("|", 1)
        if d == domain and (needle in name or name in needle):
            return code
    return None


# ── Compliance readiness (per-domain advisory, PS2 "compliance validation") ──

_GENERIC_COMPLIANCE = [
    {"name": "Udyam Registration", "note": "Your MSE identity on ONDC — already part of this registration."},
    {"name": "GST Registration", "note": "Required by most seller platforms to list products (mandatory above ₹40 lakh turnover; voluntary below)."},
    {"name": "PAN", "note": "Needed for seller-platform payouts and settlements."},
    {"name": "Bank account + cancelled cheque", "note": "For ONDC settlement via your seller platform."},
]

DOMAIN_COMPLIANCE: dict[str, list[dict]] = {
    "RET10": [{"name": "FSSAI License/Registration", "note": "Mandatory for selling food & grocery items online."}],
    "RET11": [{"name": "FSSAI License", "note": "Mandatory for F&B; kitchen/premises registration applies."}],
    "RET13": [{"name": "CDSCO/State Drug License", "note": "Needed for cosmetics manufacturing claims; labels must follow Legal Metrology."}],
    "RET14": [{"name": "BIS/CRS Registration", "note": "Mandatory for notified electronics (chargers, batteries, LED products)."}],
    "RET15": [{"name": "BIS/CRS + Energy Label", "note": "Appliances often need BIS and BEE star-label compliance."}],
    "RET18": [{"name": "FSSAI / AYUSH License", "note": "Supplements need FSSAI; ayurvedic medicines need AYUSH manufacturing license."}],
}


def get_compliance_checklist(domain: str, has_gst: bool = False, has_pan: bool = False) -> list[dict]:
    """Advisory checklist for the predicted domain, with status per item."""
    items = []
    for item in DOMAIN_COMPLIANCE.get(domain, []) + _GENERIC_COMPLIANCE:
        status = "action"
        if item["name"].startswith("GST") and has_gst:
            status = "done"
        elif item["name"] == "PAN" and has_pan:
            status = "done"
        elif item["name"].startswith("Udyam"):
            status = "done"
        items.append({**item, "status": status})
    return items


# ── ONDC Taxonomy for LLM prompt (PoC fallback if DB unavailable) ────

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

def _build_classify_prompt() -> str:
    _load_taxonomy()
    return f"""You are VargBot, an AI classification engine for India's ONDC (Open Network for Digital Commerce).

Your task: Given a business description (in any Indian language — Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Konkani, or code-mixed), classify it into the correct ONDC retail domain and leaf category, and extract sectoral product attributes.

{_taxonomy_prompt}

Return ONLY a valid JSON object with exactly this structure:
{{
  "predictions": [
    {{
      "domain": "RET10",
      "domain_name": "Grocery",
      "confidence": 0.85,
      "category_name": "Masala & Seasoning",
      "explanation": "The business primarily deals in turmeric and spice trading, which maps to Masala & Seasoning under Grocery."
    }},
    {{ "domain": "...", "domain_name": "...", "confidence": 0.10, "category_name": null, "explanation": "..." }},
    {{ "domain": "...", "domain_name": "...", "confidence": 0.05, "category_name": null, "explanation": "..." }}
  ],
  "attributes": {{
    "material": "brass",
    "craft_type": "handmade",
    "occasion": "festive",
    "target_market": "home decor buyers"
  }}
}}

Rules:
- Return exactly 3 predictions, ranked by confidence (highest first); confidences sum to ~1.0
- The top prediction should have high confidence (>0.6) for clear cases; distribute for ambiguous ones
- "category_name" must be copied EXACTLY from the taxonomy list of the chosen domain (or null if none fits)
- "explanation" is 1-2 sentences in English explaining WHY this domain fits
- "attributes" is a flat object of up to 6 sectoral product attributes genuinely inferable from the text
  (e.g. material, fabric, colour, craft_type, occasion, grade, packaging, target_market). Omit what you cannot infer.
- Understand text in ANY Indian language or Hinglish
- Return ONLY the JSON, no markdown fences, no text outside the JSON"""


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


def _valid_domains() -> set[str]:
    return _valid_domains_full or VALID_DOMAINS


def _parse_classification_json(raw: str) -> Optional[tuple[list[ClassificationPrediction], dict]]:
    """Parse LLM JSON response into (predictions, attributes)."""
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

    valid = _valid_domains()
    results: list[ClassificationPrediction] = []
    for p in preds_raw[:3]:
        if not isinstance(p, dict):
            continue
        domain = p.get("domain", "")
        if domain not in valid:
            continue
        cat_name = p.get("category_name")
        results.append(ClassificationPrediction(
            domain=domain,
            confidence=round(float(p.get("confidence", 0.0)), 4),
            category=p.get("category") or _resolve_category(domain, cat_name),
            category_name=cat_name,
            explanation=p.get("explanation"),
        ))

    if not results:
        return None

    # Ensure we have exactly 3 predictions (pad with remaining domains)
    seen = {r["domain"] for r in results}
    remaining = sorted(d for d in valid if d not in seen)
    while len(results) < 3 and remaining:
        d = remaining.pop(0)
        results.append(ClassificationPrediction(
            domain=d,
            confidence=round(0.01, 4),
            category=None,
            category_name=None,
            explanation=None,
        ))

    # Sectoral attributes (flat dict of short strings)
    attributes: dict = {}
    raw_attrs = parsed.get("attributes") if isinstance(parsed, dict) else None
    if isinstance(raw_attrs, dict):
        for k, v in list(raw_attrs.items())[:6]:
            if isinstance(v, str) and v.strip() and len(v) <= 60:
                attributes[str(k)[:30]] = v.strip()

    return results[:3], attributes


# ── LLM engines ───────────────────────────────────────────────────────

# Sarvam-30B is a reasoning model; without this it can spend its whole token
# budget thinking and return empty content.
_BREVITY_SUFFIX = (
    "\n\nIMPORTANT: Do not deliberate. Keep any internal reasoning under 30 words, "
    "then output the JSON immediately."
)


async def _classify_with_sarvam(
    description: str,
) -> Optional[tuple[list[ClassificationPrediction], dict]]:
    """Classify using the Sarvam chat completion API (sovereign)."""
    if not SARVAM_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {SARVAM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": SARVAM_CHAT_MODEL,
                    "temperature": 0.1,
                    "max_tokens": 4096,
                    "messages": [
                        {"role": "system", "content": _build_classify_prompt() + _BREVITY_SUFFIX},
                        {"role": "user", "content": f"Classify this business:\n\n{description}"},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"].get("content") or ""
            parsed = _parse_classification_json(content)
            if parsed:
                preds, attrs = parsed
                logger.info(
                    f"VargBot {SARVAM_CHAT_MODEL}: {preds[0]['domain']} @ {preds[0]['confidence']}"
                    f" | attrs={list(attrs)}"
                )
                return preds, attrs
            logger.warning(f"VargBot {SARVAM_CHAT_MODEL}: unparseable JSON response")
    except Exception as e:
        logger.error(f"VargBot {SARVAM_CHAT_MODEL} error: {e}")

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
) -> tuple[list[ClassificationPrediction], str, dict]:
    """Return (top-3 predictions, engine_name, sectoral attributes).

    Chain: Sarvam-30B → MuRIL (if loaded) → keywords.
    """
    # 1. Try Sarvam (sovereign Indian LLM)
    parsed = await _classify_with_sarvam(description)
    if parsed:
        preds, attrs = parsed
        return preds, "sarvam-llm", attrs

    # 2. Try MuRIL if loaded
    if _use_muril:
        return _classify_with_muril(description), "muril-lora", {}

    # 3. Keyword fallback
    logger.info("Sarvam unavailable, using keyword fallback")
    return _classify_with_keywords(description), "keyword-fallback", {}


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
