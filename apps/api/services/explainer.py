"""Vernacular explainer generation for Responsible AI.

Every match result must include a human-readable explanation in English
and Hindi so that MSE owners understand *why* an SNP was recommended.

In production this calls Sarvam AI Translate API or Llama 3.1 8B for
natural language generation. For the PoC we use template-based generation.
"""

from typing import Any

# ── Templates ─────────────────────────────────────────────────────────

_EN_TEMPLATE = (
    "{snp_name} is recommended for {mse_name} because: "
    "Domain fit is {domain_label} ({domain_score:.0%}), "
    "geographic coverage is {geo_label} ({geo_score:.0%}), "
    "and commission rate is {comm_label} ({commission_pct:.1f}%). "
    "Overall confidence: {band_label} ({composite:.0%})."
)

_HI_TEMPLATE = (
    "{snp_name} को {mse_name} के लिए सुझाया गया है क्योंकि: "
    "डोमेन मिलान {domain_label_hi} है ({domain_score:.0%}), "
    "भौगोलिक कवरेज {geo_label_hi} है ({geo_score:.0%}), "
    "और कमीशन दर {comm_label_hi} है ({commission_pct:.1f}%)। "
    "कुल विश्वास: {band_label_hi} ({composite:.0%})।"
)

_LABELS = {
    "domain": {(0.8, 1.0): ("strong", "मजबूत"), (0.4, 0.8): ("moderate", "मध्यम"), (0.0, 0.4): ("weak", "कमजोर")},
    "geo": {(0.7, 1.0): ("excellent", "उत्कृष्ट"), (0.4, 0.7): ("good", "अच्छा"), (0.0, 0.4): ("limited", "सीमित")},
    "commission": {(0.7, 1.0): ("competitive", "प्रतिस्पर्धी"), (0.4, 0.7): ("moderate", "सामान्य"), (0.0, 0.4): ("high", "अधिक")},
    "band": {"green": ("High", "उच्च"), "yellow": ("Medium", "मध्यम"), "red": ("Low", "निम्न")},
}


def _label(factor: str, score: float) -> tuple[str, str]:
    for (lo, hi), labels in _LABELS[factor].items():
        if lo <= score <= hi:
            return labels
    return ("unknown", "अज्ञात")


def generate_explainer(mse: Any, snp: Any, scores: dict, band: str) -> dict[str, str]:
    """Generate English and Hindi explanation strings."""
    d_en, d_hi = _label("domain", scores["domain"])
    g_en, g_hi = _label("geo", scores["geo"])
    c_en, c_hi = _label("commission", scores["commission"])
    b_en, b_hi = _LABELS["band"].get(band, ("Unknown", "अज्ञात"))

    ctx = dict(
        snp_name=snp.name,
        mse_name=mse.name,
        domain_label=d_en,
        domain_label_hi=d_hi,
        domain_score=scores["domain"],
        geo_label=g_en,
        geo_label_hi=g_hi,
        geo_score=scores["geo"],
        comm_label=c_en,
        comm_label_hi=c_hi,
        commission_pct=snp.commission_pct,
        band_label=b_en,
        band_label_hi=b_hi,
        composite=scores["composite"],
    )

    return {
        "en": _EN_TEMPLATE.format(**ctx),
        "hi": _HI_TEMPLATE.format(**ctx),
    }
