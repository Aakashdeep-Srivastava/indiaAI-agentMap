# -*- coding: utf-8 -*-
"""VargBot v2 — technical-robustness evidence for the shipped artifact.

Complements ml/reports/vargbot_tfidf_v2_eval.json (which already carries the
stratified split, C-grid, 5-fold CV, per-domain P/R/F1 and the 14x14 confusion
matrix) with the robustness metrics that report does not yet contain:

  A. AUC-ROC (macro + per-class, one-vs-rest), log loss, balanced accuracy
  B. Inference latency (p50/p95/p99, single-item and batched) and a cost model
  C. Model-family comparison — the incumbent LogisticRegression scored against
     alternative linear/NB families on the SAME split, with the selection
     rationale recorded

This script NEVER retrains or overwrites the served artifact. It loads
ml/models/vargbot_tfidf_v2.joblib as shipped and reproduces the training
split from the same corpus + SEED, so every number below describes the model
that is actually in production.

Report: ml/reports/vargbot_robustness_eval.json
Run:    python ml/evaluation/evaluate_vargbot_robustness.py
"""

import csv
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import balanced_accuracy_score, f1_score, log_loss, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import label_binarize

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from evaluation.metrics import classification_metrics  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent.parent

# Must match ml/train_vargbot_tfidf_v2.py exactly, or the "held-out" test rows
# would not be the ones the shipped model was actually held out from.
SEED = 20260708
ARTIFACT = ROOT / "ml" / "models" / "vargbot_tfidf_v2.joblib"
CORPUS = ROOT / "data" / "processed" / "training_corpus_v2.csv"

# Serving gate — above this the domain is fixed and Sarvam-30B resolves the
# leaf (a paid call); below it the LLM does zero-shot over the taxonomy.
SERVING_GATE = float(os.getenv("VARGBOT_TFIDF_MIN_CONF", "0.55"))

# Cost inputs. These are ASSUMPTIONS, not measurements — override via env and
# reconcile against the actual Azure invoice before quoting externally.
COMPUTE_HOURLY_USD = float(os.getenv("COMPUTE_HOURLY_USD", "0.10"))
USD_INR = float(os.getenv("USD_INR", "87.0"))


# ── Load corpus and reproduce the training split ──────────────────────
texts, labels, sources = [], [], []
with open(CORPUS, encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        t = (row.get("text") or "").strip()
        d = (row.get("ondc_domain") or "").strip()
        if t and d:
            texts.append(t)
            labels.append(d)
            sources.append((row.get("source") or "?").strip())

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
print(f"corpus {len(texts)} rows | split train {len(X_tr)} / val {len(X_val)} "
      f"/ test {len(X_te)}")

model = joblib.load(ARTIFACT)
classes = list(model.classes_)
print(f"loaded {ARTIFACT.name} ({ARTIFACT.stat().st_size / 1e6:.1f} MB), "
      f"{len(classes)} classes")


# ── A. Probabilistic robustness on the held-out test set ──────────────
proba = model.predict_proba(X_te)
pred = np.array(classes)[proba.argmax(axis=1)]

cls_index = {c: i for i, c in enumerate(classes)}
y_true_idx = [cls_index[y] for y in y_te]
y_pred_idx = [cls_index[y] for y in pred]

core = classification_metrics(y_true_idx, y_pred_idx, y_prob=proba,
                              label_names=classes)

y_bin = label_binarize(y_true_idx, classes=list(range(len(classes))))
per_class_auc = {}
for i, c in enumerate(classes):
    # A class absent from the test split has no defined ROC curve.
    if y_bin[:, i].sum() == 0:
        per_class_auc[c] = None
    else:
        per_class_auc[c] = round(float(roc_auc_score(y_bin[:, i], proba[:, i])), 4)

robustness = {
    "accuracy": round(core["accuracy"], 4),
    "balanced_accuracy": round(float(balanced_accuracy_score(y_true_idx, y_pred_idx)), 4),
    "precision_macro": round(core["precision_macro"], 4),
    "recall_macro": round(core["recall_macro"], 4),
    "f1_macro": round(core["f1_macro"], 4),
    "f1_weighted": round(core["f1_weighted"], 4),
    "auc_roc_macro_ovr": round(core["auc_roc"], 4) if core["auc_roc"] is not None else None,
    "auc_roc_weighted_ovr": round(float(roc_auc_score(
        y_bin, proba, average="weighted", multi_class="ovr")), 4),
    "log_loss": round(float(log_loss(y_true_idx, proba,
                                     labels=list(range(len(classes))))), 4),
    "auc_roc_per_class": per_class_auc,
}
print(f"AUC-ROC macro-OVR {robustness['auc_roc_macro_ovr']} | "
      f"log loss {robustness['log_loss']} | "
      f"balanced acc {robustness['balanced_accuracy']}")


# ── B. Inference latency and cost model ───────────────────────────────
# Single-item latency is what a live /classify request actually pays.
sample = X_te[:300] if len(X_te) >= 300 else X_te
for _ in range(20):                      # warm up lazy vectoriser internals
    model.predict_proba([sample[0]])

singles = []
for text in sample:
    t0 = time.perf_counter()
    model.predict_proba([text])
    singles.append((time.perf_counter() - t0) * 1000.0)
singles.sort()


def pct(vals, q):
    return round(float(vals[min(int(len(vals) * q), len(vals) - 1)]), 3)


t0 = time.perf_counter()
model.predict_proba(X_te)
batch_total_s = time.perf_counter() - t0

mean_ms = float(np.mean(singles))
batch_ms = batch_total_s * 1000.0 / len(X_te)

# Cost follows from occupied compute time; the trained model itself makes no
# paid API call. Above the gate the chain also fires one Sarvam-30B leaf call,
# which is billed per token and is NOT included in the figure below.
gate_share = float((proba.max(axis=1) >= SERVING_GATE).mean())
cost_usd = COMPUTE_HOURLY_USD * (mean_ms / 1000.0) / 3600.0

latency = {
    "single_item_ms": {
        "mean": round(mean_ms, 3),
        "p50": pct(singles, 0.50),
        "p95": pct(singles, 0.95),
        "p99": pct(singles, 0.99),
        "n_samples": len(singles),
    },
    "batched_ms_per_item": round(batch_ms, 4),
    "batch_throughput_items_per_s": round(len(X_te) / batch_total_s, 1),
    "cost_model": {
        "compute_hourly_usd": COMPUTE_HOURLY_USD,
        "usd_inr": USD_INR,
        "cost_per_inference_usd": round(cost_usd, 10),
        "cost_per_inference_inr": round(cost_usd * USD_INR, 10),
        "inferences_per_usd": int(1.0 / cost_usd) if cost_usd else None,
        "note": ("Compute-time cost of the trained classifier only. "
                 "COMPUTE_HOURLY_USD is an assumed App Service rate, not a "
                 "measured invoice figure. Predictions at or above the serving "
                 "gate additionally trigger one Sarvam-30B leaf-resolution "
                 "call billed per token, which is excluded here."),
    },
    "serving_gate": SERVING_GATE,
    "share_above_gate": round(gate_share, 4),
    "hardware": ("local dev CPU — Azure App Service S1 will differ; re-run on "
                 "the target tier before quoting"),
}
print(f"latency p50 {latency['single_item_ms']['p50']} ms / "
      f"p95 {latency['single_item_ms']['p95']} ms | "
      f"{latency['batch_throughput_items_per_s']} items/s batched")


# ── C. Model-family comparison on the same split ──────────────────────
# The rubric asks for a variety of families, not just a hyperparameter sweep.
# Each candidate is trained on train and scored on validation — the held-out
# test set stays untouched so it remains an honest final estimate.
def build_features():
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import FeatureUnion
    return FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), max_features=120_000,
                                 sublinear_tf=True, min_df=2)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                 max_features=80_000, sublinear_tf=True,
                                 min_df=2)),
    ])


def candidates():
    from sklearn.linear_model import (LogisticRegression, RidgeClassifier,
                                      SGDClassifier)
    from sklearn.naive_bayes import ComplementNB
    from sklearn.svm import LinearSVC
    return [
        ("LogisticRegression (C=2.0, balanced) — INCUMBENT",
         LogisticRegression(C=2.0, max_iter=2000, class_weight="balanced", n_jobs=-1),
         True),
        ("LinearSVC (C=1.0, balanced)",
         LinearSVC(C=1.0, class_weight="balanced"), False),
        ("SGDClassifier (modified_huber, balanced)",
         SGDClassifier(loss="modified_huber", max_iter=2000, random_state=SEED,
                       class_weight="balanced"), True),
        ("ComplementNB (alpha=0.3)", ComplementNB(alpha=0.3), True),
        ("RidgeClassifier (balanced)",
         RidgeClassifier(class_weight="balanced"), False),
    ]


from sklearn.pipeline import Pipeline  # noqa: E402

family_rows = []
for name, clf, has_proba in candidates():
    pipe = Pipeline([("tfidf", build_features()), ("clf", clf)])
    t0 = time.perf_counter()
    pipe.fit(X_tr, y_tr)
    fit_s = time.perf_counter() - t0
    vp = pipe.predict(X_val)
    family_rows.append({
        "model": name,
        "val_macro_f1": round(float(f1_score(y_val, vp, average="macro")), 4),
        "val_accuracy": round(float((np.array(vp) == np.array(y_val)).mean()), 4),
        "fit_seconds": round(fit_s, 1),
        "calibrated_probabilities": has_proba,
    })
    print(f"  {name}: val macro-F1 {family_rows[-1]['val_macro_f1']} "
          f"({fit_s:.0f}s fit, proba={has_proba})")

family_rows.sort(key=lambda r: r["val_macro_f1"], reverse=True)

# Derive the verdict from the measured numbers rather than asserting one, so
# the rationale can never drift away from the table above it.
incumbent = next(r for r in family_rows if "INCUMBENT" in r["model"])
proba_rows = [r for r in family_rows if r["calibrated_probabilities"]]
best_overall = family_rows[0]
best_proba = proba_rows[0]
gate_blocked = [r["model"] for r in family_rows if not r["calibrated_probabilities"]]

rationale = [
    f"The serving chain gates on predict_proba at {SERVING_GATE}: at or above "
    "the gate the domain is fixed and Sarvam-30B only resolves the leaf; below "
    "it the LLM does zero-shot over the whole taxonomy. A family exposing only "
    "decision_function cannot drive that gate, which rules out "
    f"{', '.join(gate_blocked)} regardless of score.",
]
if best_proba["model"] != incumbent["model"]:
    delta = round(best_proba["val_macro_f1"] - incumbent["val_macro_f1"], 4)
    rationale.append(
        f"OPEN FINDING — the incumbent is not the strongest probability-capable "
        f"family on this split: {best_proba['model']} scores "
        f"{best_proba['val_macro_f1']} vs the incumbent's "
        f"{incumbent['val_macro_f1']} (+{delta} val macro-F1). This is recorded, "
        "not acted on. A swap is not a drop-in: modified_huber probabilities "
        "come from a clipped decision function and are materially less "
        "well-calibrated than logistic ones, and the entire confidence gate, "
        "the Green/Yellow/Red bands and the drift monitor's low-confidence "
        "alerts are all calibration-dependent. Adopting it requires re-running "
        "the gate calibration and the CI behavioural gate first."
    )
else:
    rationale.append(
        "The incumbent is also the strongest probability-capable family on "
        "this split, so no change is indicated."
    )

selection = {
    "candidates": family_rows,
    "in_production": incumbent["model"],
    "highest_val_macro_f1_overall": best_overall["model"],
    "highest_val_macro_f1_with_probabilities": best_proba["model"],
    "incumbent_is_best_gate_compatible": best_proba["model"] == incumbent["model"],
    "protocol": ("each family trained on train, scored on validation; the "
                 "held-out test set was not touched, so the test metrics above "
                 "remain an honest final estimate"),
    "rationale": " ".join(rationale),
}


# ── Write report ──────────────────────────────────────────────────────
out = {
    "meta": {
        "generated": date.today().isoformat(),
        "artifact": ARTIFACT.name,
        "artifact_size_mb": round(ARTIFACT.stat().st_size / 1e6, 1),
        "evaluated": ("shipped artifact, not retrained — split reproduced from "
                      f"training_corpus_v2.csv with SEED={SEED}"),
        "n_test": len(y_te),
        "n_classes": len(classes),
        "level": "domain",
        "companion_report": "vargbot_tfidf_v2_eval.json",
        "note": ("Supplements the primary eval with AUC-ROC, log loss, "
                 "balanced accuracy, latency/cost and a model-family "
                 "comparison. Accuracy and macro-F1 restate the primary "
                 "report and must agree with it."),
    },
    "technical_robustness": robustness,
    "inference_performance": latency,
    "model_selection": selection,
    "confusion_matrix": {"labels": classes,
                         "matrix": core["confusion_matrix"]},
}

dest = ROOT / "ml" / "reports" / "vargbot_robustness_eval.json"
dest.write_text(json.dumps(out, indent=2), encoding="utf-8")
print(f"\nwrote {dest.relative_to(ROOT)}")
