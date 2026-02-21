"""Rule-based baseline vs AI benchmark.

Compares a simple keyword-matching rule-based classifier against the
MuRIL-based AI classifier to demonstrate improvement.

Usage:
    python -m ml.evaluation.baseline
"""

import logging
import re

import numpy as np

from ml.evaluation.metrics import (
    accuracy_at_k,
    confidence_band_distribution,
    mrr,
    ndcg_at_k,
    print_evaluation_report,
)
from ml.pipelines.train_vargbot import LABEL2ID, build_synthetic_dataset

logger = logging.getLogger(__name__)


# ── Rule-based classifier ────────────────────────────────────────────

KEYWORD_RULES: dict[str, list[str]] = {
    "RET10": ["grocery", "kirana", "rice", "dal", "flour", "spice", "atta", "oil", "sugar", "tea"],
    "RET12": ["cloth", "garment", "textile", "saree", "kurta", "fabric", "fashion", "cotton", "silk"],
    "RET14": ["electronic", "mobile", "phone", "computer", "laptop", "repair", "led", "fan"],
    "RET16": ["furniture", "kitchen", "utensil", "steel", "wooden", "craft", "pottery", "bamboo"],
    "RET18": ["ayurved", "herbal", "medicine", "health", "organic", "yoga", "honey", "natural"],
}


def rule_based_classify(text: str) -> list[tuple[str, float]]:
    """Keyword-frequency rule-based classification. Returns ranked (domain, score) pairs."""
    text_lower = text.lower()
    scores: dict[str, float] = {}

    for domain, keywords in KEYWORD_RULES.items():
        hits = sum(1 for kw in keywords if re.search(rf"\b{kw}", text_lower))
        scores[domain] = hits / len(keywords) if keywords else 0.0

    total = sum(scores.values()) or 1.0
    normalised = {d: s / total for d, s in scores.items()}
    ranked = sorted(normalised.items(), key=lambda x: x[1], reverse=True)
    return ranked


def evaluate_rule_based():
    """Run full evaluation of the rule-based baseline on synthetic data."""
    texts, labels = build_synthetic_dataset(n_per_class=100)
    id2label = {v: k for k, v in LABEL2ID.items()}

    y_true = labels
    y_pred_ranked = []
    relevance_scores = []
    top1_scores = []

    for text, true_label in zip(texts, labels):
        ranked = rule_based_classify(text)
        pred_ids = [LABEL2ID[domain] for domain, _ in ranked]
        y_pred_ranked.append(pred_ids)

        # Relevance: 1.0 for correct domain, 0.0 otherwise
        rels = [1.0 if LABEL2ID[d] == true_label else 0.0 for d, _ in ranked]
        relevance_scores.append(rels)
        top1_scores.append(ranked[0][1])

    acc1 = accuracy_at_k(y_true, y_pred_ranked, k=1)
    acc3 = accuracy_at_k(y_true, y_pred_ranked, k=3)
    mrr_score = mrr(y_true, y_pred_ranked)
    ndcg3 = ndcg_at_k(relevance_scores, k=3)
    band_dist = confidence_band_distribution(top1_scores)

    print("\n>>> RULE-BASED BASELINE <<<")
    print_evaluation_report(acc1, acc3, mrr_score, ndcg3, band_dist)

    return {
        "accuracy@1": acc1,
        "accuracy@3": acc3,
        "mrr": mrr_score,
        "ndcg@3": ndcg3,
        "band_distribution": band_dist,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    evaluate_rule_based()
