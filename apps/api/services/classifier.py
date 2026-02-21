"""MuRIL-based ONDC domain classification service.

In production this loads the fine-tuned MuRIL LoRA adapter.
For the MVP PoC we use a deterministic keyword-based mock that mirrors the
expected model output shape so the full API contract is exercised end-to-end.
"""

import re
from typing import TypedDict

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


class Prediction(TypedDict):
    domain: str
    confidence: float


def classify_mse_description(description: str, language: str = "en") -> list[Prediction]:
    """Return top-3 ONDC domain predictions for an MSE description.

    MVP mock: keyword frequency scoring.  Replace with MuRIL inference
    when the fine-tuned adapter is available.
    """
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
