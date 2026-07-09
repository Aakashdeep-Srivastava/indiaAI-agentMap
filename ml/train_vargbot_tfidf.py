# -*- coding: utf-8 -*-
"""Train VargBot's supervised domain classifier (TF-IDF + linear model).

Methodology (matches the Annexure II rubric):
- Corpus: data/processed/product_category_pairs.csv (19.6K labelled pairs)
- Stratified 80/10/10 train/val/test split, fixed seed
- 5-fold cross-validation on train for model stability (mean ± std)
- Small hyperparameter grid on validation (C for the linear classifier)
- Held-out TEST metrics: accuracy, per-domain P/R/F1, macro/micro F1,
  confusion matrix → ml/reports/vargbot_tfidf_eval.json
- Model artifact → ml/models/vargbot_tfidf_v1.joblib (deployable fallback)

Run: python ml/train_vargbot_tfidf.py
"""

import csv
import json
import sys
import time
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score)
from sklearn.model_selection import (StratifiedKFold, cross_val_score,
                                     train_test_split)
from sklearn.pipeline import Pipeline

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent
SEED = 20260708

# ── Load corpus ────────────────────────────────────────────────────────
texts, labels = [], []
with open(ROOT / "data" / "processed" / "product_category_pairs.csv",
          encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        dom = (row.get("ondc_domain") or "").strip()
        name = (row.get("product_name") or "").strip()
        desc = (row.get("description") or "").strip()[:600]
        if dom and name:
            texts.append(f"{name}. {desc}")
            labels.append(dom)

dist = Counter(labels)
print(f"corpus: {len(texts)} pairs | domains: {dict(sorted(dist.items()))}")

# ── Stratified 80/10/10 ────────────────────────────────────────────────
X_tr, X_tmp, y_tr, y_tmp = train_test_split(
    texts, labels, test_size=0.2, stratify=labels, random_state=SEED)
X_val, X_te, y_val, y_te = train_test_split(
    X_tmp, y_tmp, test_size=0.5, stratify=y_tmp, random_state=SEED)
print(f"split: train={len(X_tr)} val={len(X_val)} test={len(X_te)} (stratified, seed {SEED})")


def make_pipe(C: float) -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=200_000,
                                  sublinear_tf=True, min_df=2)),
        ("clf", LogisticRegression(C=C, max_iter=2000, class_weight="balanced",
                                   n_jobs=-1)),
    ])


# ── Hyperparameter selection on validation ─────────────────────────────
t0 = time.time()
best_C, best_val = None, -1.0
val_table = {}
for C in (0.5, 1.0, 2.0):
    pipe = make_pipe(C)
    pipe.fit(X_tr, y_tr)
    v = f1_score(y_val, pipe.predict(X_val), average="macro")
    val_table[C] = round(v, 4)
    print(f"  C={C}: val macro-F1={v:.4f} ({time.time()-t0:.0f}s)")
    if v > best_val:
        best_C, best_val = C, v
print(f"selected C={best_C}")

# ── 5-fold CV on train (stability) ─────────────────────────────────────
cv = cross_val_score(make_pipe(best_C), X_tr, y_tr, scoring="f1_macro",
                     cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
                     n_jobs=1)
print(f"5-fold CV macro-F1: {cv.mean():.4f} ± {cv.std():.4f}")

# ── Final fit on train+val, evaluate on held-out TEST ──────────────────
final = make_pipe(best_C)
final.fit(X_tr + X_val, y_tr + y_val)
pred = final.predict(X_te)

acc = accuracy_score(y_te, pred)
macro = f1_score(y_te, pred, average="macro")
micro = f1_score(y_te, pred, average="micro")
report = classification_report(y_te, pred, output_dict=True, zero_division=0)
doms = sorted(set(y_te))
cm = confusion_matrix(y_te, pred, labels=doms)

out = {
    "meta": {
        "trained": "2026-07-08",
        "model": "TF-IDF (1-2 grams, 200K feats) + LogisticRegression (balanced)",
        "corpus": "product_category_pairs.csv — 19.6K labelled product→ONDC-domain pairs",
        "split": "stratified 80/10/10, seed 20260708",
        "hyperparam_grid": {"C": val_table, "selected_C": best_C},
        "cv_5fold_macro_f1": {"mean": round(float(cv.mean()), 4),
                              "std": round(float(cv.std()), 4)},
        "level": "domain",
        "n_test": len(y_te),
    },
    "test_accuracy": round(acc, 4),
    "test_macro_f1": round(macro, 4),
    "test_micro_f1": round(micro, 4),
    "per_domain": {d: {"precision": round(report[d]["precision"], 3),
                       "recall": round(report[d]["recall"], 3),
                       "f1": round(report[d]["f1-score"], 3),
                       "support": int(report[d]["support"])}
                   for d in doms if d in report},
    "confusion_matrix": {"labels": doms, "matrix": cm.tolist()},
}

(ROOT / "ml" / "reports").mkdir(parents=True, exist_ok=True)
(ROOT / "ml" / "models").mkdir(parents=True, exist_ok=True)
(ROOT / "ml" / "reports" / "vargbot_tfidf_eval.json").write_text(json.dumps(out, indent=2))
joblib.dump(final, ROOT / "ml" / "models" / "vargbot_tfidf_v1.joblib", compress=3)

print("\n================ HELD-OUT TEST ================")
print(f"ACCURACY  : {acc:.4f}")
print(f"MACRO F1  : {macro:.4f}")
print(f"MICRO F1  : {micro:.4f}")
for d in doms:
    r = report[d]
    print(f"  {d}: P={r['precision']:.3f} R={r['recall']:.3f} F1={r['f1-score']:.3f} (n={int(r['support'])})")
size_mb = (ROOT / "ml" / "models" / "vargbot_tfidf_v1.joblib").stat().st_size / 1e6
print(f"\nartifact: ml/models/vargbot_tfidf_v1.joblib ({size_mb:.1f} MB)")
print(f"report:   ml/reports/vargbot_tfidf_eval.json ({time.time()-t0:.0f}s total)")
