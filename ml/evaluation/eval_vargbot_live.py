# -*- coding: utf-8 -*-
"""Honest domain-level evaluation of the LIVE VargBot classifier.

Method: stratified sample from the labelled product→ONDC-domain corpus
(data/processed/product_category_pairs.csv, Flipkart-derived labels),
classified through the production /classify/text endpoint (Sarvam-30B chain).
Reports accuracy, per-domain precision/recall/F1, macro-F1, confusion matrix.
Writes ml/reports/vargbot_domain_eval.json.
"""

import csv
import json
import random
import sys
import time
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent.parent
API = "https://agentmap-api.azurewebsites.net"
PER_DOMAIN = 40          # stratified sample size per domain
CONCURRENCY = 4
SEED = 20260708

random.seed(SEED)


def post_json(path, payload, token=None, timeout=90):
    req = urllib.request.Request(
        API + path, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8",
                 **({"Authorization": f"Bearer {token}"} if token else {})},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode())


# ── Load labelled pairs, stratify ──────────────────────────────────────
by_domain: dict[str, list[dict]] = defaultdict(list)
with open(ROOT / "data" / "processed" / "product_category_pairs.csv",
          encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        dom = (row.get("ondc_domain") or "").strip()
        name = (row.get("product_name") or "").strip()
        desc = (row.get("description") or "").strip()[:400]
        if dom and name:
            by_domain[dom].append({"text": f"{name}. {desc}", "label": dom})

sample = []
for dom, items in sorted(by_domain.items()):
    random.shuffle(items)
    sample.extend(items[:PER_DOMAIN])
random.shuffle(sample)
print(f"domains: {sorted(by_domain)} | sample: {len(sample)} "
      f"({PER_DOMAIN}/domain where available)")

tok = post_json("/auth/login", {"username": "mse@msmemate.com", "password": "bharat123"})["access_token"]


def classify(item):
    for attempt in (1, 2):
        try:
            d = post_json("/classify/text",
                          {"description": item["text"], "language": "en"},
                          token=tok, timeout=60)
            return item["label"], d["selected_domain"], d.get("engine")
        except Exception:
            if attempt == 2:
                return item["label"], None, "error"
            time.sleep(3)


t0 = time.time()
results = []
with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
    for i, r in enumerate(ex.map(classify, sample), 1):
        results.append(r)
        if i % 40 == 0:
            print(f"  {i}/{len(sample)} classified ({time.time()-t0:.0f}s)")

engines = Counter(e for _, _, e in results)
scored = [(t, p) for t, p, _ in results if p]
n = len(scored)
correct = sum(1 for t, p in scored if t == p)

# Per-domain P/R/F1
domains = sorted({t for t, _ in scored} | {p for _, p in scored})
conf = {t: Counter() for t in domains}
for t, p in scored:
    conf[t][p] += 1

per_domain = {}
f1s = []
for d in domains:
    tp = conf.get(d, Counter())[d]
    fn = sum(conf.get(d, Counter()).values()) - tp
    fp = sum(conf.get(o, Counter())[d] for o in domains if o != d)
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    support = tp + fn
    if support:
        per_domain[d] = {"precision": round(prec, 3), "recall": round(rec, 3),
                         "f1": round(f1, 3), "support": support}
        f1s.append(f1)

report = {
    "meta": {
        "evaluated": "2026-07-08",
        "system": "VargBot live production classifier (Sarvam-30B chain, zero-shot vs official taxonomy)",
        "endpoint": "/classify/text",
        "ground_truth": "product_category_pairs.csv (Flipkart-derived ONDC domain labels)",
        "sampling": f"stratified, up to {PER_DOMAIN}/domain, seed {SEED}",
        "n_scored": n,
        "engines_used": dict(engines),
        "level": "domain (14-way where represented)",
    },
    "accuracy": round(correct / n, 3) if n else None,
    "macro_f1": round(sum(f1s) / len(f1s), 3) if f1s else None,
    "per_domain": per_domain,
    "confusion": {t: dict(c) for t, c in conf.items() if c},
}

out = ROOT / "ml" / "reports"
out.mkdir(parents=True, exist_ok=True)
(out / "vargbot_domain_eval.json").write_text(json.dumps(report, indent=2))

print("\n================ RESULTS ================")
print(f"N = {n} | engines: {dict(engines)}")
print(f"DOMAIN ACCURACY : {report['accuracy']}")
print(f"MACRO F1        : {report['macro_f1']}")
for d, m in sorted(per_domain.items()):
    print(f"  {d}: P={m['precision']} R={m['recall']} F1={m['f1']} (n={m['support']})")
print(f"report → ml/reports/vargbot_domain_eval.json ({time.time()-t0:.0f}s)")
