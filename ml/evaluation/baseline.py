"""Rule-based baseline vs AI benchmark.

Compares a simple keyword-matching rule-based classifier against the
MuRIL-based AI classifier to demonstrate improvement.

Usage:
    python -m ml.evaluation.baseline
    python -m ml.evaluation.baseline --compare --model_dir ml/models/vargbot-muril-lora
"""

import argparse
import logging
import re

import numpy as np

from ml.evaluation.metrics import (
    accuracy_at_k,
    classification_metrics,
    confidence_band_distribution,
    mrr,
    ndcg_at_k,
    print_classification_report,
    print_evaluation_report,
)
from ml.pipelines.train_vargbot import ID2LABEL, LABEL2ID, NUM_LABELS, build_synthetic_dataset

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


def evaluate_rule_based(n_per_class: int = 100):
    """Run full evaluation of the rule-based baseline on synthetic data."""
    texts, labels = build_synthetic_dataset(n_per_class=n_per_class)

    y_true = labels
    y_pred_ranked = []
    y_pred_top1 = []
    relevance_scores = []
    top1_scores = []

    for text, true_label in zip(texts, labels):
        ranked = rule_based_classify(text)
        pred_ids = [LABEL2ID[domain] for domain, _ in ranked]
        y_pred_ranked.append(pred_ids)
        y_pred_top1.append(pred_ids[0])

        # Relevance: 1.0 for correct domain, 0.0 otherwise
        rels = [1.0 if LABEL2ID[d] == true_label else 0.0 for d, _ in ranked]
        relevance_scores.append(rels)
        top1_scores.append(ranked[0][1])

    # Ranking metrics
    acc1 = accuracy_at_k(y_true, y_pred_ranked, k=1)
    acc3 = accuracy_at_k(y_true, y_pred_ranked, k=3)
    mrr_score = mrr(y_true, y_pred_ranked)
    ndcg3 = ndcg_at_k(relevance_scores, k=3)
    band_dist = confidence_band_distribution(top1_scores)

    print("\n>>> RULE-BASED BASELINE <<<")
    print_evaluation_report(acc1, acc3, mrr_score, ndcg3, band_dist)

    # Classification metrics
    label_names = [ID2LABEL[i] for i in range(NUM_LABELS)]
    cls_metrics = classification_metrics(
        y_true=y_true,
        y_pred=y_pred_top1,
        label_names=label_names,
    )

    print("\n>>> RULE-BASED CLASSIFICATION METRICS <<<")
    print_classification_report(cls_metrics, label_names)

    return {
        "accuracy@1": acc1,
        "accuracy@3": acc3,
        "mrr": mrr_score,
        "ndcg@3": ndcg3,
        "band_distribution": band_dist,
        "classification": cls_metrics,
    }


def compare_baseline_vs_ai(model_dir: str, n_per_class: int = 100):
    """Side-by-side comparison of baseline vs trained AI model."""
    from ml.evaluation.evaluate_vargbot import run_inference

    texts, labels = build_synthetic_dataset(n_per_class=n_per_class)
    label_names = [ID2LABEL[i] for i in range(NUM_LABELS)]

    # ── Baseline ──────────────────────────────────────────────────
    baseline_preds = []
    for text in texts:
        ranked = rule_based_classify(text)
        baseline_preds.append(LABEL2ID[ranked[0][0]])

    baseline_metrics = classification_metrics(
        y_true=labels, y_pred=baseline_preds, label_names=label_names,
    )

    # ── AI Model ──────────────────────────────────────────────────
    ai_preds, ai_probs = run_inference(texts, model_dir)
    ai_metrics = classification_metrics(
        y_true=labels, y_pred=ai_preds, y_prob=ai_probs, label_names=label_names,
    )

    # ── Side-by-side report ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("  BASELINE vs AI — Side-by-Side Comparison")
    print("=" * 60)
    print(f"  {'Metric':<22} {'Baseline':>12} {'AI (MuRIL)':>12} {'Delta':>10}")
    print(f"  {'─' * 56}")

    for metric in ["accuracy", "precision_macro", "recall_macro", "f1_macro", "f1_weighted"]:
        b = baseline_metrics[metric]
        a = ai_metrics[metric]
        delta = a - b
        arrow = "+" if delta > 0 else ""
        print(f"  {metric:<22} {b:>12.4f} {a:>12.4f} {arrow}{delta:>9.4f}")

    if ai_metrics.get("auc_roc") is not None:
        print(f"  {'auc_roc':<22} {'N/A':>12} {ai_metrics['auc_roc']:>12.4f} {'':>10}")

    print("=" * 60)

    print("\n>>> BASELINE <<<")
    print_classification_report(baseline_metrics, label_names)

    print("\n>>> AI MODEL <<<")
    print_classification_report(ai_metrics, label_names)

    return {"baseline": baseline_metrics, "ai": ai_metrics}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate rule-based baseline")
    parser.add_argument("--compare", action="store_true", help="Compare baseline vs AI model")
    parser.add_argument("--model_dir", type=str, default="ml/models/vargbot-muril-lora")
    parser.add_argument("--n_per_class", type=int, default=100)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if args.compare:
        compare_baseline_vs_ai(args.model_dir, args.n_per_class)
    else:
        evaluate_rule_based(args.n_per_class)
