"""VargBot evaluation runner.

Loads a trained MuRIL + LoRA adapter and runs full inference on the
held-out test set, computing classification metrics and saving a report.

Usage:
    python -m ml.evaluation.evaluate_vargbot --model_dir ml/models/vargbot-muril-lora
"""

import argparse
import json
import logging
from pathlib import Path

import numpy as np

from ml.evaluation.metrics import (
    classification_metrics,
    print_classification_report,
)
from ml.pipelines.train_vargbot import ID2LABEL, LABEL2ID, NUM_LABELS

logger = logging.getLogger(__name__)


def load_test_set(model_dir: str) -> tuple[list[str], list[int]]:
    """Load test set saved during training."""
    test_path = Path(model_dir) / "test_set.json"
    if not test_path.exists():
        raise FileNotFoundError(
            f"Test set not found at {test_path}. "
            "Run training with --split_ratio to generate it."
        )
    with open(test_path) as f:
        data = json.load(f)
    return data["texts"], data["labels"]


def run_inference(
    texts: list[str],
    model_dir: str,
) -> tuple[list[int], np.ndarray]:
    """Load adapter and run inference on texts.

    Returns:
        preds: Predicted label indices.
        probs: (n_samples, n_classes) probability matrix.
    """
    import torch
    from peft import PeftModel
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    adapter_path = Path(model_dir) / "adapter"
    if not adapter_path.exists():
        raise FileNotFoundError(f"Adapter not found at {adapter_path}")

    logger.info(f"Loading tokenizer from {adapter_path}")
    tokenizer = AutoTokenizer.from_pretrained(str(adapter_path))

    # Load adapter config to find base model
    config_path = adapter_path / "adapter_config.json"
    with open(config_path) as f:
        adapter_config = json.load(f)
    base_model_name = adapter_config.get("base_model_name_or_path", "google/muril-base-cased")

    logger.info(f"Loading base model: {base_model_name}")
    base_model = AutoModelForSequenceClassification.from_pretrained(
        base_model_name,
        num_labels=NUM_LABELS,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    logger.info("Loading LoRA adapter")
    model = PeftModel.from_pretrained(base_model, str(adapter_path))
    model.eval()

    all_preds = []
    all_probs = []

    batch_size = 32
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        inputs = tokenizer(
            batch_texts,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = model(**inputs)

        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        preds = torch.argmax(probs, dim=-1)

        all_preds.extend(preds.cpu().tolist())
        all_probs.append(probs.cpu().numpy())

    return all_preds, np.concatenate(all_probs, axis=0)


def evaluate(model_dir: str, test_texts: list[str] | None = None, test_labels: list[int] | None = None):
    """Run full evaluation pipeline."""
    if test_texts is None or test_labels is None:
        logger.info("Loading test set from model directory")
        test_texts, test_labels = load_test_set(model_dir)

    logger.info(f"Test set: {len(test_texts)} samples")

    # Run inference
    preds, probs = run_inference(test_texts, model_dir)

    # Compute metrics
    label_names = [ID2LABEL[i] for i in range(NUM_LABELS)]
    metrics = classification_metrics(
        y_true=test_labels,
        y_pred=preds,
        y_prob=probs,
        label_names=label_names,
    )

    # Print report
    print_classification_report(metrics, label_names)

    # Save JSON report
    reports_dir = Path("ml/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_path = reports_dir / "vargbot_eval.json"

    serializable = {k: v for k, v in metrics.items() if k != "classification_report"}
    serializable["classification_report"] = {
        k: {kk: round(vv, 4) if isinstance(vv, float) else vv for kk, vv in v.items()}
        if isinstance(v, dict) else v
        for k, v in metrics["classification_report"].items()
    }

    with open(report_path, "w") as f:
        json.dump(serializable, f, indent=2)
    logger.info(f"Report saved to {report_path}")

    return metrics


def main():
    parser = argparse.ArgumentParser(description="Evaluate VargBot classification model")
    parser.add_argument(
        "--model_dir",
        type=str,
        default="ml/models/vargbot-muril-lora",
        help="Path to model directory containing adapter/ and test_set.json",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    evaluate(args.model_dir)


if __name__ == "__main__":
    main()
