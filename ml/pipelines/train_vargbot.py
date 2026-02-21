"""MuRIL fine-tuning pipeline for ONDC domain classification (VargBot).

Fine-tunes google/muril-base-cased with LoRA adapters on MSE description →
ONDC domain label pairs.  Designed to run on a single GPU (T4/A10) or
CPU-only for PoC experimentation.

Usage:
    python -m ml.pipelines.train_vargbot --data_path data/train.csv --epochs 5
"""

import argparse
import json
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# ── ONDC domain labels (PoC subset) ──────────────────────────────────

LABEL2ID = {
    "RET10": 0,  # Grocery
    "RET12": 1,  # Fashion
    "RET14": 2,  # Electronics
    "RET16": 3,  # Home & Kitchen
    "RET18": 4,  # Health & Wellness
}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}
NUM_LABELS = len(LABEL2ID)

MODEL_NAME = "google/muril-base-cased"


def load_dataset_from_csv(path: str) -> tuple[list[str], list[int]]:
    """Load MSE descriptions and domain labels from a CSV file.

    Expected columns: description, domain_code
    """
    import pandas as pd

    df = pd.read_csv(path)
    texts = df["description"].tolist()
    labels = df["domain_code"].map(LABEL2ID).tolist()
    return texts, labels


def build_synthetic_dataset(n_per_class: int = 200) -> tuple[list[str], list[int]]:
    """Generate synthetic training data for PoC when real data is unavailable."""
    templates = {
        "RET10": [
            "We sell {item} and grocery provisions to local customers",
            "Our kirana store stocks {item}, rice, dal, and daily essentials",
            "Wholesale dealer of {item} and organic staples",
        ],
        "RET12": [
            "We manufacture {item} and traditional Indian garments",
            "Handloom {item} maker from Varanasi, exporting across India",
            "Boutique stitching and {item} tailoring services",
        ],
        "RET14": [
            "Mobile phone and {item} repair shop",
            "We distribute {item} and consumer electronics",
            "LED lights, fans, and {item} retail store",
        ],
        "RET16": [
            "Handmade {item} and wooden furniture workshop",
            "Steel utensils, {item}, and kitchen supplies wholesale",
            "Traditional pottery and {item} craft business",
        ],
        "RET18": [
            "Ayurvedic {item} and herbal wellness products",
            "Organic honey, {item}, and natural health supplements",
            "Yoga accessories and {item} wellness store",
        ],
    }

    items = {
        "RET10": ["atta", "spices", "pulses", "cooking oil", "sugar", "tea"],
        "RET12": ["sarees", "kurtas", "silk fabric", "cotton textiles", "dupattas"],
        "RET14": ["laptops", "chargers", "cables", "power banks", "speakers"],
        "RET16": ["bamboo baskets", "steel vessels", "clay pots", "decorative items"],
        "RET18": ["herbal medicine", "tulsi drops", "neem products", "ashwagandha"],
    }

    texts, labels = [], []
    rng = np.random.default_rng(42)

    for domain, tmpls in templates.items():
        domain_items = items[domain]
        for _ in range(n_per_class):
            tmpl = rng.choice(tmpls)
            item = rng.choice(domain_items)
            texts.append(tmpl.format(item=item))
            labels.append(LABEL2ID[domain])

    return texts, labels


def train(
    texts: list[str],
    labels: list[int],
    output_dir: str = "ml/models/vargbot-muril-lora",
    epochs: int = 5,
    batch_size: int = 16,
    learning_rate: float = 2e-4,
    lora_r: int = 16,
    lora_alpha: int = 32,
):
    """Fine-tune MuRIL with LoRA for ONDC domain classification."""
    try:
        from datasets import Dataset
        from peft import LoraConfig, TaskType, get_peft_model
        from transformers import (
            AutoModelForSequenceClassification,
            AutoTokenizer,
            Trainer,
            TrainingArguments,
        )
    except ImportError as e:
        logger.error(
            "ML dependencies not installed. Run: pip install -r ml/requirements.txt"
        )
        raise e

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"Loading tokenizer and model: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=NUM_LABELS,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    # Apply LoRA
    lora_config = LoraConfig(
        task_type=TaskType.SEQ_CLS,
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=0.1,
        target_modules=["query", "value"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Tokenize
    dataset = Dataset.from_dict({"text": texts, "label": labels})
    splits = dataset.train_test_split(test_size=0.15, seed=42)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

    train_ds = splits["train"].map(tokenize, batched=True)
    eval_ds = splits["test"].map(tokenize, batched=True)

    training_args = TrainingArguments(
        output_dir=str(output_path),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=10,
        fp16=False,  # Set True if GPU supports it
    )

    def compute_metrics(eval_pred):
        from sklearn.metrics import accuracy_score

        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {"accuracy": accuracy_score(labels, preds)}

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        compute_metrics=compute_metrics,
    )

    logger.info("Starting training...")
    trainer.train()

    # Save adapter
    model.save_pretrained(str(output_path / "adapter"))
    tokenizer.save_pretrained(str(output_path / "adapter"))

    # Save label mapping
    with open(output_path / "label_map.json", "w") as f:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL}, f, indent=2)

    logger.info(f"Model saved to {output_path}")
    return trainer


def main():
    parser = argparse.ArgumentParser(description="Fine-tune MuRIL for ONDC classification")
    parser.add_argument("--data_path", type=str, default=None, help="Path to training CSV")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--synthetic_n", type=int, default=200, help="Samples per class for synthetic data")
    parser.add_argument("--output_dir", type=str, default="ml/models/vargbot-muril-lora")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if args.data_path:
        texts, labels = load_dataset_from_csv(args.data_path)
    else:
        logger.info(f"No data_path provided — generating synthetic dataset ({args.synthetic_n}/class)")
        texts, labels = build_synthetic_dataset(args.synthetic_n)

    logger.info(f"Dataset: {len(texts)} samples, {NUM_LABELS} classes")
    train(texts, labels, output_dir=args.output_dir, epochs=args.epochs, batch_size=args.batch_size, learning_rate=args.lr)


if __name__ == "__main__":
    main()
