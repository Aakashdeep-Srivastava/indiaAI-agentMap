"""MuRIL-based ONDC domain classification service.

Supports dual-mode operation:
  - If VARGBOT_MODEL_DIR points to a valid LoRA adapter, loads MuRIL + LoRA
  - Otherwise, falls back to the deterministic keyword-based mock
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import TypedDict

logger = logging.getLogger(__name__)

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


class Prediction(TypedDict):
    domain: str
    confidence: float


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
            logger.warning(f"Failed to load MuRIL adapter: {e}. Falling back to keyword mock.")
            _use_muril = False
    else:
        logger.info("No VARGBOT_MODEL_DIR set or adapter not found — using keyword mock classifier")
        _use_muril = False


def _classify_with_muril(description: str) -> list[Prediction]:
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
        Prediction(
            domain=ID2LABEL[idx.item()],
            confidence=round(probs[idx].item(), 4),
        )
        for idx in top3_indices
    ]


def _classify_with_keywords(description: str) -> list[Prediction]:
    """Keyword frequency scoring (mock classifier)."""
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
        Prediction(domain=domain, confidence=round(conf, 4))
        for domain, conf in ranked[:3]
    ]


def classify_mse_description(description: str, language: str = "en") -> list[Prediction]:
    """Return top-3 ONDC domain predictions for an MSE description.

    Uses MuRIL if loaded, otherwise falls back to keyword mock.
    """
    if _use_muril:
        return _classify_with_muril(description)
    return _classify_with_keywords(description)
