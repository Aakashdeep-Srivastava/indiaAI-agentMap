"""MuRIL fine-tuning pipeline for ONDC domain classification (VargBot).

Fine-tunes google/muril-base-cased with LoRA adapters on MSE description →
ONDC domain label pairs.  Designed to run on a single GPU (T4/A10) or
CPU-only for PoC experimentation.

Usage:
    python -m ml.pipelines.train_vargbot --data_path data/train.csv --epochs 5
    python -m ml.pipelines.train_vargbot --synthetic_n 1000 --cv 5 --epochs 3
"""

import argparse
import json
import logging
import random
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


# ── Expanded synthetic data generation ───────────────────────────────

TEMPLATES = {
    "RET10": [
        "We sell {item} and grocery provisions to local customers",
        "Our kirana store stocks {item}, rice, dal, and daily essentials",
        "Wholesale dealer of {item} and organic staples",
        "Hum {item} aur grocery ka saman bechte hain",
        "Hamare yahan {item}, chawal, daal milta hai",
        "Retail shop selling {item} along with spices and cooking oil",
        "Provision store dealing in {item} and everyday household groceries",
        "We supply {item} to local markets and small retailers",
        "Family-run grocery business specializing in {item} and pulses",
        "Hum log {item} ka wholesale karte hain, saath mein masale bhi",
        "Our business is wholesale trading of {item} and food grains",
        "Village-level distribution of {item} and daily need items",
        "Supplying {item} and staples to hotels and restaurants",
        "Traditional grocery merchant dealing in {item} and dry provisions",
        "Bulk {item} trading and retail distribution in local mandi",
    ],
    "RET12": [
        "We manufacture {item} and traditional Indian garments",
        "Handloom {item} maker from Varanasi, exporting across India",
        "Boutique stitching and {item} tailoring services",
        "Hum {item} banate hain, handloom ka kaam karte hain",
        "Hamara {item} ka karobar hai, kapde silte hain",
        "Designer {item} and ethnic wear production unit",
        "Wholesale exporter of {item} and woven textiles",
        "Our workshop produces {item} for online and retail markets",
        "Weaving and {item} manufacturing with traditional techniques",
        "Hum {item} aur readymade garments ka business karte hain",
        "Small-scale {item} production with block printing and dyeing",
        "Trading in {item} and fashion accessories for women",
        "Custom tailoring and {item} design studio for festivals",
        "Handcraft {item} using indigenous weaving methods",
        "We deal in {item} and ethnic wear for wholesale buyers",
    ],
    "RET14": [
        "Mobile phone and {item} repair shop",
        "We distribute {item} and consumer electronics",
        "LED lights, fans, and {item} retail store",
        "Hum {item} aur mobile ka repair karte hain",
        "Hamara {item} ka electronics shop hai",
        "Retail and wholesale of {item} and electrical components",
        "Service center for {item} and home appliance repair",
        "We assemble and sell {item} along with computer peripherals",
        "Our shop sells {item}, inverters, and smart devices",
        "Hum log {item} bechte hain, saath mein wiring ka kaam bhi",
        "Authorized dealer of {item} and telecommunications equipment",
        "E-waste recycling and refurbished {item} sales",
        "Online and offline sales of {item} and gadget accessories",
        "Electrical contracting services with {item} supply",
        "Solar panel, {item}, and energy equipment distribution",
    ],
    "RET16": [
        "Handmade {item} and wooden furniture workshop",
        "Steel utensils, {item}, and kitchen supplies wholesale",
        "Traditional pottery and {item} craft business",
        "Hum {item} aur furniture banate hain",
        "Hamara {item} ka handicraft ka kaam hai",
        "Artisan workshop producing {item} and home décor items",
        "Wholesale supply of {item} and stainless steel cookware",
        "Our family makes {item} using traditional craft methods",
        "Bamboo and cane {item} production for eco-friendly homes",
        "Hum {item} aur bartan ka vyapar karte hain",
        "Interior design materials including {item} and furnishings",
        "Handcrafted {item} and decorative art from local artisans",
        "Export-quality {item} and wooden home accessories",
        "We make {item} and supply to home décor retailers",
        "Ceramic and terracotta {item} workshop with online sales",
    ],
    "RET18": [
        "Ayurvedic {item} and herbal wellness products",
        "Organic honey, {item}, and natural health supplements",
        "Yoga accessories and {item} wellness store",
        "Hum {item} aur ayurvedic dawai bechte hain",
        "Hamara {item} ka organic health store hai",
        "Manufacturing of {item} and traditional herbal remedies",
        "Wellness center selling {item} and naturopathy products",
        "Our brand produces {item} using ancient Ayurvedic recipes",
        "Health food store with {item} and dietary supplements",
        "Hum {item} aur yoga samaan ka karobar karte hain",
        "Organic farming and {item} retail for health-conscious buyers",
        "Herbal beauty products including {item} and skincare",
        "Natural {item} and immunity boosters for daily wellness",
        "We supply {item} to pharmacies and wellness chains",
        "Traditional {item} preparation using village herbs and plants",
    ],
}

ITEMS = {
    "RET10": [
        "atta", "spices", "pulses", "cooking oil", "sugar", "tea",
        "rice", "dal", "masala", "ghee", "jaggery", "turmeric",
        "wheat", "mustard oil", "salt", "besan", "poha", "sooji",
        "chana", "rajma", "moong", "urad dal", "pickle", "papad",
        "jeera", "coriander", "chilli powder", "hing", "bay leaf",
        "cardamom",
    ],
    "RET12": [
        "sarees", "kurtas", "silk fabric", "cotton textiles", "dupattas",
        "lehengas", "salwar suits", "shawls", "stoles", "dhotis",
        "bandhani prints", "chikankari", "block print fabric",
        "woolen garments", "embroidered cloth", "linen shirts",
        "denim fabric", "kalamkari", "patola silk", "chanderi sarees",
        "ikat fabric", "khadi cloth", "pashmina", "jute bags",
        "readymade garments",
    ],
    "RET14": [
        "laptops", "chargers", "cables", "power banks", "speakers",
        "LED bulbs", "ceiling fans", "mobile phones", "tablets",
        "switches", "circuit boards", "inverters", "batteries",
        "smart watches", "headphones", "wifi routers", "pen drives",
        "CCTV cameras", "stabilizers", "soldering equipment",
        "extension cords", "adapters", "voltage regulators",
        "LED panels", "UPS systems",
    ],
    "RET16": [
        "bamboo baskets", "steel vessels", "clay pots", "decorative items",
        "wooden chairs", "dining tables", "wall hangings", "mat weaving",
        "brass utensils", "copper pots", "terracotta planters",
        "cane furniture", "stone carvings", "glass vases", "jute rugs",
        "iron shelves", "marble items", "lacquerware", "paper mache",
        "coconut shell crafts", "wrought iron gates", "wooden toys",
        "kitchen racks", "storage boxes", "ceramic tiles",
    ],
    "RET18": [
        "herbal medicine", "tulsi drops", "neem products", "ashwagandha",
        "aloe vera gel", "amla juice", "triphala churna", "honey",
        "moringa powder", "giloy tablets", "brahmi capsules",
        "shilajit", "chyawanprash", "essential oils", "meditation cushions",
        "yoga mats", "incense sticks", "camphor", "sandalwood paste",
        "herbal shampoo", "organic ghee", "turmeric latte mix",
        "shatavari", "mulethi powder", "natural sunscreen",
    ],
}


def noise_augment(text: str, rng: np.random.Generator) -> str:
    """Apply random augmentations: word dropout, typo injection, sentence reorder."""
    words = text.split()
    if len(words) < 3:
        return text

    # Word dropout (10% chance per word)
    if rng.random() < 0.3:
        words = [w for w in words if rng.random() > 0.1]
        if len(words) < 2:
            words = text.split()

    # Typo injection (swap adjacent characters in a random word)
    if rng.random() < 0.2 and words:
        idx = rng.integers(0, len(words))
        word = words[idx]
        if len(word) > 2:
            pos = rng.integers(0, len(word) - 1)
            chars = list(word)
            chars[pos], chars[pos + 1] = chars[pos + 1], chars[pos]
            words[idx] = "".join(chars)

    # Sentence fragment reorder (split at comma/and, shuffle)
    if rng.random() < 0.15:
        result = " ".join(words)
        parts = [p.strip() for p in result.replace(" and ", ", ").split(",") if p.strip()]
        if len(parts) > 1:
            rng.shuffle(parts)
            return ", ".join(parts)

    return " ".join(words)


def build_synthetic_dataset(n_per_class: int = 1000) -> tuple[list[str], list[int]]:
    """Generate synthetic training data for PoC when real data is unavailable."""
    texts, labels = [], []
    rng = np.random.default_rng(42)

    for domain, tmpls in TEMPLATES.items():
        domain_items = ITEMS[domain]
        for _ in range(n_per_class):
            tmpl = rng.choice(tmpls)
            item = rng.choice(domain_items)
            text = tmpl.format(item=item)
            # Apply noise augmentation to ~40% of samples
            if rng.random() < 0.4:
                text = noise_augment(text, rng)
            texts.append(text)
            labels.append(LABEL2ID[domain])

    return texts, labels


def save_dataset(texts: list[str], labels: list[int], output_dir: str = "ml/data"):
    """Export dataset to CSV."""
    import pandas as pd

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    id2label = {v: k for k, v in LABEL2ID.items()}
    df = pd.DataFrame({
        "description": texts,
        "domain_code": [id2label[l] for l in labels],
        "label_id": labels,
    })
    path = out / "synthetic_train.csv"
    df.to_csv(path, index=False)
    logger.info(f"Saved {len(df)} samples to {path}")
    return path


# ── Stratified split ─────────────────────────────────────────────────


def stratified_split(
    texts: list[str],
    labels: list[int],
    split_ratio: str = "80/10/10",
    seed: int = 42,
) -> dict:
    """Stratified train/val/test split.

    Returns dict with keys 'train', 'val', 'test', each containing
    {'texts': [...], 'labels': [...]}.
    """
    from sklearn.model_selection import StratifiedShuffleSplit

    parts = [int(x) for x in split_ratio.split("/")]
    assert len(parts) == 3 and sum(parts) == 100, f"Invalid split_ratio: {split_ratio}"
    train_pct, val_pct, test_pct = [p / 100.0 for p in parts]

    texts_arr = np.array(texts)
    labels_arr = np.array(labels)

    # First split: separate test set
    test_frac = test_pct
    sss1 = StratifiedShuffleSplit(n_splits=1, test_size=test_frac, random_state=seed)
    trainval_idx, test_idx = next(sss1.split(texts_arr, labels_arr))

    # Second split: separate val from train
    val_frac_of_trainval = val_pct / (train_pct + val_pct)
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=val_frac_of_trainval, random_state=seed)
    train_idx, val_idx = next(sss2.split(texts_arr[trainval_idx], labels_arr[trainval_idx]))

    # Map back to original indices
    actual_train_idx = trainval_idx[train_idx]
    actual_val_idx = trainval_idx[val_idx]

    result = {
        "train": {"texts": texts_arr[actual_train_idx].tolist(), "labels": labels_arr[actual_train_idx].tolist()},
        "val": {"texts": texts_arr[actual_val_idx].tolist(), "labels": labels_arr[actual_val_idx].tolist()},
        "test": {"texts": texts_arr[test_idx].tolist(), "labels": labels_arr[test_idx].tolist()},
    }

    for name, data in result.items():
        unique, counts = np.unique(data["labels"], return_counts=True)
        logger.info(f"  {name}: {len(data['texts'])} samples — {dict(zip(unique.tolist(), counts.tolist()))}")

    return result


# ── 5-fold cross-validation ──────────────────────────────────────────


def cross_validate(
    texts: list[str],
    labels: list[int],
    n_folds: int = 5,
    epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-4,
    lora_r: int = 16,
    lora_alpha: int = 32,
) -> dict:
    """Run stratified k-fold cross-validation and aggregate metrics."""
    from sklearn.model_selection import StratifiedKFold
    from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

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
        logger.error("ML dependencies not installed. Run: pip install -r ml/requirements.txt")
        raise e

    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    texts_arr = np.array(texts)
    labels_arr = np.array(labels)

    fold_metrics = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(texts_arr, labels_arr)):
        logger.info(f"\n{'='*50}\n  FOLD {fold + 1}/{n_folds}\n{'='*50}")

        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME, num_labels=NUM_LABELS, id2label=ID2LABEL, label2id=LABEL2ID,
        )
        lora_config = LoraConfig(
            task_type=TaskType.SEQ_CLS, r=lora_r, lora_alpha=lora_alpha,
            lora_dropout=0.1, target_modules=["query", "value"],
        )
        model = get_peft_model(model, lora_config)

        train_ds = Dataset.from_dict({"text": texts_arr[train_idx].tolist(), "label": labels_arr[train_idx].tolist()})
        val_ds = Dataset.from_dict({"text": texts_arr[val_idx].tolist(), "label": labels_arr[val_idx].tolist()})

        def tokenize(batch):
            return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

        train_ds = train_ds.map(tokenize, batched=True)
        val_ds = val_ds.map(tokenize, batched=True)

        output_dir = f"ml/models/cv_fold_{fold}"
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            learning_rate=learning_rate,
            weight_decay=0.01,
            eval_strategy="epoch",
            save_strategy="no",
            logging_steps=10,
            fp16=False,
        )

        def compute_metrics(eval_pred):
            logits, lbls = eval_pred
            preds = np.argmax(logits, axis=-1)
            return {
                "accuracy": accuracy_score(lbls, preds),
                "f1_macro": f1_score(lbls, preds, average="macro"),
                "precision_macro": precision_score(lbls, preds, average="macro"),
                "recall_macro": recall_score(lbls, preds, average="macro"),
            }

        trainer = Trainer(
            model=model, args=training_args,
            train_dataset=train_ds, eval_dataset=val_ds,
            compute_metrics=compute_metrics,
        )
        trainer.train()
        metrics = trainer.evaluate()
        fold_metrics.append(metrics)
        logger.info(f"Fold {fold + 1} metrics: {metrics}")

    # Aggregate metrics
    metric_keys = ["eval_accuracy", "eval_f1_macro", "eval_precision_macro", "eval_recall_macro"]
    aggregated = {}
    for key in metric_keys:
        values = [m.get(key, 0) for m in fold_metrics]
        aggregated[key] = {"mean": float(np.mean(values)), "std": float(np.std(values))}

    logger.info(f"\n{'='*50}\n  CROSS-VALIDATION SUMMARY ({n_folds}-fold)\n{'='*50}")
    for key, stats in aggregated.items():
        name = key.replace("eval_", "")
        logger.info(f"  {name:20s}: {stats['mean']:.4f} +/- {stats['std']:.4f}")

    return {"fold_metrics": fold_metrics, "aggregated": aggregated}


# ── Main training ────────────────────────────────────────────────────


def train(
    texts: list[str],
    labels: list[int],
    output_dir: str = "ml/models/vargbot-muril-lora",
    epochs: int = 5,
    batch_size: int = 16,
    learning_rate: float = 2e-4,
    lora_r: int = 16,
    lora_alpha: int = 32,
    split_ratio: str = "80/10/10",
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

    # Stratified split
    logger.info(f"Splitting data with ratio {split_ratio}")
    splits = stratified_split(texts, labels, split_ratio=split_ratio)

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
    train_ds = Dataset.from_dict({"text": splits["train"]["texts"], "label": splits["train"]["labels"]})
    val_ds = Dataset.from_dict({"text": splits["val"]["texts"], "label": splits["val"]["labels"]})
    test_ds = Dataset.from_dict({"text": splits["test"]["texts"], "label": splits["test"]["labels"]})

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

    train_ds = train_ds.map(tokenize, batched=True)
    val_ds = val_ds.map(tokenize, batched=True)
    test_ds = test_ds.map(tokenize, batched=True)

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
        metric_for_best_model="f1_macro",
        logging_steps=10,
        fp16=False,  # Set True if GPU supports it
    )

    def compute_metrics(eval_pred):
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

        logits, lbls = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_score(lbls, preds),
            "f1_macro": f1_score(lbls, preds, average="macro"),
            "precision_macro": precision_score(lbls, preds, average="macro"),
            "recall_macro": recall_score(lbls, preds, average="macro"),
        }

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
    )

    logger.info("Starting training...")
    trainer.train()

    # Final evaluation on held-out test set
    logger.info("Evaluating on test set...")
    test_metrics = trainer.evaluate(test_ds)
    logger.info(f"Test set metrics: {test_metrics}")

    # Save adapter
    model.save_pretrained(str(output_path / "adapter"))
    tokenizer.save_pretrained(str(output_path / "adapter"))

    # Save label mapping
    with open(output_path / "label_map.json", "w") as f:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL}, f, indent=2)

    # Save test set for later evaluation
    test_path = output_path / "test_set.json"
    with open(test_path, "w") as f:
        json.dump({"texts": splits["test"]["texts"], "labels": splits["test"]["labels"]}, f)
    logger.info(f"Test set saved to {test_path}")

    logger.info(f"Model saved to {output_path}")
    return trainer, test_metrics


def main():
    parser = argparse.ArgumentParser(description="Fine-tune MuRIL for ONDC classification")
    parser.add_argument("--data_path", type=str, default=None, help="Path to training CSV")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--synthetic_n", type=int, default=1000, help="Samples per class for synthetic data")
    parser.add_argument("--output_dir", type=str, default="ml/models/vargbot-muril-lora")
    parser.add_argument("--split_ratio", type=str, default="80/10/10", help="Train/val/test split ratio")
    parser.add_argument("--cv", type=int, default=0, help="Number of CV folds (0=no CV, 5=5-fold)")
    parser.add_argument("--save_data", action="store_true", help="Export synthetic dataset to CSV")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if args.data_path:
        texts, labels = load_dataset_from_csv(args.data_path)
    else:
        logger.info(f"No data_path provided — generating synthetic dataset ({args.synthetic_n}/class)")
        texts, labels = build_synthetic_dataset(args.synthetic_n)

    logger.info(f"Dataset: {len(texts)} samples, {NUM_LABELS} classes")

    if args.save_data:
        save_dataset(texts, labels)

    if args.cv > 0:
        cv_results = cross_validate(
            texts, labels,
            n_folds=args.cv,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
        )
        # Save CV results
        cv_path = Path(args.output_dir) / "cv_results.json"
        cv_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cv_path, "w") as f:
            json.dump(cv_results["aggregated"], f, indent=2)
        logger.info(f"CV results saved to {cv_path}")
    else:
        train(
            texts, labels,
            output_dir=args.output_dir,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
            split_ratio=args.split_ratio,
        )


if __name__ == "__main__":
    main()
