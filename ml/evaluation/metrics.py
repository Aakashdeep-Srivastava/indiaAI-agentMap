"""Evaluation metrics for AgentMap AI.

Implements NDCG@3, MRR (Mean Reciprocal Rank), and Top-k Accuracy as
specified in the PRD for benchmarking classification and matching quality.
"""

import numpy as np


def accuracy_at_k(y_true: list[int], y_pred_ranked: list[list[int]], k: int = 1) -> float:
    """Top-k accuracy: fraction of samples where the true label appears in top-k predictions.

    Args:
        y_true: Ground truth labels (one per sample).
        y_pred_ranked: For each sample, a ranked list of predicted labels (best first).
        k: Consider top-k predictions.

    Returns:
        Accuracy@k as a float between 0 and 1.
    """
    correct = 0
    for true, preds in zip(y_true, y_pred_ranked):
        if true in preds[:k]:
            correct += 1
    return correct / len(y_true) if y_true else 0.0


def mrr(y_true: list[int], y_pred_ranked: list[list[int]]) -> float:
    """Mean Reciprocal Rank.

    For each sample, the reciprocal rank is 1/(position of first correct answer).
    MRR is the mean across all samples.

    Args:
        y_true: Ground truth labels.
        y_pred_ranked: Ranked prediction lists per sample.

    Returns:
        MRR score as a float between 0 and 1.
    """
    rr_sum = 0.0
    for true, preds in zip(y_true, y_pred_ranked):
        for rank, pred in enumerate(preds, start=1):
            if pred == true:
                rr_sum += 1.0 / rank
                break
    return rr_sum / len(y_true) if y_true else 0.0


def ndcg_at_k(relevance_scores: list[list[float]], k: int = 3) -> float:
    """Normalised Discounted Cumulative Gain @ k.

    Args:
        relevance_scores: For each query, a list of relevance scores in the
            order returned by the system (not sorted).
        k: Truncation depth.

    Returns:
        Mean NDCG@k across all queries.
    """
    ndcg_values = []

    for scores in relevance_scores:
        # DCG@k
        dcg = 0.0
        for i, rel in enumerate(scores[:k]):
            dcg += (2**rel - 1) / np.log2(i + 2)

        # Ideal DCG@k (sort descending)
        ideal = sorted(scores, reverse=True)
        idcg = 0.0
        for i, rel in enumerate(ideal[:k]):
            idcg += (2**rel - 1) / np.log2(i + 2)

        ndcg_values.append(dcg / idcg if idcg > 0 else 0.0)

    return float(np.mean(ndcg_values)) if ndcg_values else 0.0


def confidence_band_distribution(scores: list[float]) -> dict[str, int]:
    """Count how many scores fall into each confidence band.

    Green: >= 0.85, Yellow: 0.60–0.85, Red: < 0.60
    """
    bands = {"green": 0, "yellow": 0, "red": 0}
    for s in scores:
        if s >= 0.85:
            bands["green"] += 1
        elif s >= 0.60:
            bands["yellow"] += 1
        else:
            bands["red"] += 1
    return bands


def print_evaluation_report(
    acc1: float,
    acc3: float,
    mrr_score: float,
    ndcg3: float,
    band_dist: dict[str, int],
):
    """Print a formatted evaluation report to stdout."""
    total = sum(band_dist.values())
    print("\n" + "=" * 50)
    print("  AgentMap AI — Evaluation Report")
    print("=" * 50)
    print(f"  Accuracy@1:   {acc1:.4f}")
    print(f"  Accuracy@3:   {acc3:.4f}")
    print(f"  MRR:          {mrr_score:.4f}")
    print(f"  NDCG@3:       {ndcg3:.4f}")
    print("-" * 50)
    print("  Confidence Band Distribution:")
    for band, count in band_dist.items():
        pct = count / total * 100 if total else 0
        bar = "#" * int(pct / 2)
        print(f"    {band:8s}: {count:4d} ({pct:5.1f}%) {bar}")
    print("=" * 50)
