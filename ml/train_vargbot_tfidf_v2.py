# -*- coding: utf-8 -*-
"""VargBot v2 — TF-IDF (word + char) + LogisticRegression domain classifier.

Corpus: data/processed/training_corpus_v2.csv (all 14 ONDC retail domains;
flipkart + mepma real product text, mse_profile real-derived Hinglish
descriptions, synthetic gap-fillers for RET15/17/18/19/1C/1D — see
scripts/build_training_corpus_v2.py).

v2 over v1:
  - 14/14 domains (v1: 8) — the serving gate can now vet every domain
  - char_wb 3-5 n-grams alongside word 1-2 (Hinglish/typo robustness)
  - per-source test metrics (synthetic twins inflate random-split scores;
    the real-only numbers are the honest ones)
  - validation-derived gate recommendation: smallest threshold with
    >=95% precision among gated predictions

Protocol unchanged from v1: stratified 80/10/10, C-grid on val macro-F1,
5-fold CV on train+val, held-out test. Artifact: ml/models/vargbot_tfidf_v2.joblib
Report: ml/reports/vargbot_tfidf_v2_eval.json

Run: python ml/train_vargbot_tfidf_v2.py
"""

import csv
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_recall_fscore_support)
from sklearn.model_selection import (StratifiedKFold, cross_val_score,
                                     train_test_split)
from sklearn.pipeline import FeatureUnion, Pipeline

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent
SEED = 20260708

# ── Load corpus ────────────────────────────────────────────────────────
texts, labels, sources = [], [], []
with open(ROOT / "data" / "processed" / "training_corpus_v2.csv",
          encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        t = (row.get("text") or "").strip()
        d = (row.get("ondc_domain") or "").strip()
        if t and d:
            texts.append(t)
            labels.append(d)
            sources.append((row.get("source") or "?").strip())

dist = Counter(labels)
print(f"corpus: {len(texts)} rows, {len(dist)} domains")

# ── Stratified 80/10/10 split (indices so source labels travel along) ──
idx = np.arange(len(texts))
idx_tr, idx_tmp = train_test_split(idx, test_size=0.2, random_state=SEED,
                                   stratify=[labels[i] for i in idx])
idx_val, idx_te = train_test_split(idx_tmp, test_size=0.5, random_state=SEED,
                                   stratify=[labels[i] for i in idx_tmp])


def take(ids):
    return ([texts[i] for i in ids], [labels[i] for i in ids],
            [sources[i] for i in ids])


X_tr, y_tr, _ = take(idx_tr)
X_val, y_val, _ = take(idx_val)
X_te, y_te, s_te = take(idx_te)
print(f"split: train {len(X_tr)} / val {len(X_val)} / test {len(X_te)}")


# ── Pipeline: word + char TF-IDF union → balanced LogReg ──────────────
def make_pipe(C: float) -> Pipeline:
    return Pipeline([
        ("tfidf", FeatureUnion([
            ("word", TfidfVectorizer(ngram_range=(1, 2), max_features=120_000,
                                     sublinear_tf=True, min_df=2)),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                     max_features=80_000, sublinear_tf=True,
                                     min_df=2)),
        ])),
        ("clf", LogisticRegression(C=C, max_iter=2000, class_weight="balanced",
                                   n_jobs=-1)),
    ])


# ── Hyperparameter selection on validation macro-F1 ───────────────────
grid_results = {}
best_C, best_f1 = None, -1.0
for C in (0.5, 1.0, 2.0):
    pipe = make_pipe(C)
    pipe.fit(X_tr, y_tr)
    f1 = f1_score(y_val, pipe.predict(X_val), average="macro")
    grid_results[str(C)] = round(f1, 4)
    print(f"C={C}: val macro-F1 {f1:.4f}")
    if f1 > best_f1:
        best_C, best_f1 = C, f1

# ── 5-fold CV on train+val ─────────────────────────────────────────────
X_trval, y_trval = X_tr + X_val, y_tr + y_val
cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
cv_scores = cross_val_score(make_pipe(best_C), X_trval, y_trval,
                            cv=cv, scoring="f1_macro", n_jobs=1)
print(f"5-fold CV macro-F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Gate calibration: precision/coverage vs threshold on validation ────
val_pipe = make_pipe(best_C)
val_pipe.fit(X_tr, y_tr)
val_proba = val_pipe.predict_proba(X_val)
val_pred = val_pipe.classes_[val_proba.argmax(axis=1)]
val_conf = val_proba.max(axis=1)
y_val_arr = np.array(y_val)
gate_table = []
recommended_gate = None
for t in [round(0.30 + 0.05 * i, 2) for i in range(13)]:  # 0.30 … 0.90
    mask = val_conf >= t
    cov = float(mask.mean())
    prec = float((val_pred[mask] == y_val_arr[mask]).mean()) if mask.any() else None
    gate_table.append({"threshold": t, "coverage": round(cov, 4),
                       "precision": round(prec, 4) if prec is not None else None})
    if recommended_gate is None and prec is not None and prec >= 0.95:
        recommended_gate = t
print(f"recommended gate (>=95% precision on val): {recommended_gate}")

# ── Final fit on train+val, held-out test evaluation ───────────────────
final = make_pipe(best_C)
final.fit(X_trval, y_trval)
pred = final.predict(X_te)

acc = accuracy_score(y_te, pred)
macro = f1_score(y_te, pred, average="macro")
micro = f1_score(y_te, pred, average="micro")
print(f"TEST: acc {acc:.4f} | macro-F1 {macro:.4f} | micro-F1 {micro:.4f}")

classes = sorted(set(y_te))
p, r, f1s, sup = precision_recall_fscore_support(y_te, pred, labels=classes,
                                                 zero_division=0)
per_domain = {c: {"precision": round(p[i], 4), "recall": round(r[i], 4),
                  "f1": round(f1s[i], 4), "support": int(sup[i])}
              for i, c in enumerate(classes)}

# Honest per-source breakdown — synthetic/template twins inflate the split
by_source = {}
s_arr, y_arr, pred_arr = np.array(s_te), np.array(y_te), np.array(pred)
for src in sorted(set(s_te)):
    m = s_arr == src
    by_source[src] = {"n": int(m.sum()),
                      "accuracy": round(float((pred_arr[m] == y_arr[m]).mean()), 4)}
real_mask = np.isin(s_arr, ["flipkart", "mepma"])
real_acc = float((pred_arr[real_mask] == y_arr[real_mask]).mean())
real_macro = f1_score(y_arr[real_mask], pred_arr[real_mask], average="macro")
print(f"TEST real-products only (flipkart+mepma, n={int(real_mask.sum())}): "
      f"acc {real_acc:.4f} | macro-F1 {real_macro:.4f}")
for src, v in by_source.items():
    print(f"  {src}: n={v['n']} acc={v['accuracy']}")

cm = confusion_matrix(y_te, pred, labels=classes)

out = {
    "meta": {
        "trained": date.today().isoformat(),
        "model": ("TF-IDF union (word 1-2 x120K + char_wb 3-5 x80K) + "
                  "LogisticRegression (balanced)"),
        "corpus": ("training_corpus_v2.csv — flipkart + mepma + mse_profile + "
                   "synthetic gap-fillers; 14/14 ONDC retail domains"),
        "corpus_by_domain": {k: dist[k] for k in sorted(dist)},
        "split": "stratified 80/10/10",
        "hyperparam_grid": {"val_macro_f1_by_C": grid_results,
                            "selected_C": best_C},
        "cv_5fold_macro_f1": {"mean": round(float(cv_scores.mean()), 4),
                              "std": round(float(cv_scores.std()), 4)},
        "level": "domain",
        "n_test": len(y_te),
        "honesty_note": ("mse_profile and synthetic rows are template-generated; "
                         "near-duplicate templates appear in both train and test, "
                         "so their subset accuracy is optimistic. The "
                         "real-products metrics (flipkart+mepma) are the "
                         "conservative evidence."),
    },
    "test_accuracy": round(acc, 4),
    "test_macro_f1": round(macro, 4),
    "test_micro_f1": round(micro, 4),
    "test_by_source": by_source,
    "test_real_products": {"n": int(real_mask.sum()),
                           "accuracy": round(real_acc, 4),
                           "macro_f1": round(real_macro, 4)},
    "gate_calibration": {"table": gate_table,
                         "recommended_gate_p95": recommended_gate},
    "per_domain": per_domain,
    "confusion_matrix": {"labels": classes, "matrix": cm.tolist()},
}

(ROOT / "ml" / "reports" / "vargbot_tfidf_v2_eval.json").write_text(
    json.dumps(out, indent=2), encoding="utf-8")
joblib.dump(final, ROOT / "ml" / "models" / "vargbot_tfidf_v2.joblib", compress=3)
size_mb = (ROOT / "ml" / "models" / "vargbot_tfidf_v2.joblib").stat().st_size / 1e6
print(f"saved vargbot_tfidf_v2.joblib ({size_mb:.1f} MB) + vargbot_tfidf_v2_eval.json")
