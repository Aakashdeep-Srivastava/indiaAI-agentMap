"""Evaluation metrics for AgentMap AI.

Implements NDCG@3, MRR (Mean Reciprocal Rank), Top-k Accuracy, and
classification metrics (accuracy, precision, recall, F1, AUC-ROC,
confusion matrix) as specified in the PRD.
"""

import numpy as np


# ── Ranking Metrics ──────────────────────────────────────────────────


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


# ── Classification Metrics ───────────────────────────────────────────


def classification_metrics(
    y_true: list[int],
    y_pred: list[int],
    y_prob: np.ndarray | None = None,
    label_names: list[str] | None = None,
) -> dict:
    """Compute comprehensive classification metrics.

    Args:
        y_true: Ground truth label indices.
        y_pred: Predicted label indices.
        y_prob: Optional (n_samples, n_classes) probability array for AUC-ROC.
        label_names: Optional class names for reporting.

    Returns:
        Dict with accuracy, precision_macro, recall_macro, f1_macro, f1_weighted,
        confusion_matrix, classification_report, and optionally auc_roc.
    """
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )

    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)

    result = {
        "accuracy": float(accuracy_score(y_true_arr, y_pred_arr)),
        "precision_macro": float(precision_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true_arr, y_pred_arr, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true_arr, y_pred_arr).tolist(),
        "classification_report": classification_report(
            y_true_arr, y_pred_arr,
            target_names=label_names,
            zero_division=0,
            output_dict=True,
        ),
    }

    # AUC-ROC (one-vs-rest) if probabilities are provided
    if y_prob is not None:
        try:
            from sklearn.metrics import roc_auc_score
            from sklearn.preprocessing import label_binarize

            n_classes = y_prob.shape[1]
            y_true_bin = label_binarize(y_true_arr, classes=list(range(n_classes)))

            if n_classes == 2:
                result["auc_roc"] = float(roc_auc_score(y_true_bin, y_prob[:, 1]))
            else:
                result["auc_roc"] = float(
                    roc_auc_score(y_true_bin, y_prob, average="macro", multi_class="ovr")
                )
        except Exception:
            result["auc_roc"] = None
    else:
        result["auc_roc"] = None

    return result


def print_confusion_matrix(cm: list[list[int]], label_names: list[str]) -> None:
    """Print a formatted ASCII confusion matrix."""
    n = len(label_names)
    max_label = max(len(l) for l in label_names)
    col_width = max(5, max_label + 1)

    # Header
    header = " " * (max_label + 2) + "".join(f"{l:>{col_width}}" for l in label_names)
    print("\n  Confusion Matrix:")
    print(f"  {'─' * len(header)}")
    print(f"  {header}")
    print(f"  {'─' * len(header)}")

    for i, row in enumerate(cm):
        row_str = f"  {label_names[i]:<{max_label + 2}}" + "".join(f"{v:>{col_width}}" for v in row)
        print(row_str)

    print(f"  {'─' * len(header)}")


def print_classification_report(metrics: dict, label_names: list[str] | None = None) -> None:
    """Print a formatted classification report from metrics dict."""
    print("\n" + "=" * 55)
    print("  VargBot — Classification Evaluation Report")
    print("=" * 55)
    print(f"  Accuracy:         {metrics['accuracy']:.4f}")
    print(f"  Precision (macro): {metrics['precision_macro']:.4f}")
    print(f"  Recall (macro):    {metrics['recall_macro']:.4f}")
    print(f"  F1 (macro):        {metrics['f1_macro']:.4f}")
    print(f"  F1 (weighted):     {metrics['f1_weighted']:.4f}")
    if metrics.get("auc_roc") is not None:
        print(f"  AUC-ROC (macro):   {metrics['auc_roc']:.4f}")
    print("-" * 55)

    # Per-class report
    report = metrics.get("classification_report", {})
    if report and label_names:
        print(f"\n  {'Class':<12} {'Prec':>8} {'Recall':>8} {'F1':>8} {'Support':>8}")
        print(f"  {'─' * 44}")
        for name in label_names:
            cls = report.get(name, {})
            print(
                f"  {name:<12} {cls.get('precision', 0):>8.4f} {cls.get('recall', 0):>8.4f} "
                f"{cls.get('f1-score', 0):>8.4f} {int(cls.get('support', 0)):>8}"
            )

    if label_names and "confusion_matrix" in metrics:
        print_confusion_matrix(metrics["confusion_matrix"], label_names)

    print("=" * 55)


# ── Legacy report ────────────────────────────────────────────────────


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
