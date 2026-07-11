# -*- coding: utf-8 -*-
"""CI smoke test for the deployed VargBot artifact.

Fails the build if the artifact that ships inside the API image is missing,
loads incorrectly, lost domain coverage, or regresses on canonical MSE-style
inputs (English + Hinglish, one per domain family). This is a behavioural
gate, not an accuracy eval — the honest metrics live in
ml/reports/vargbot_tfidf_v2_eval.json.

Run: python ml/tests/smoke_test_vargbot.py  (from repo root; CI does the same)
"""

import os
import sys
from pathlib import Path

import joblib

ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACT = Path(os.getenv(
    "VARGBOT_TFIDF_PATH",
    str(ROOT / "apps" / "api" / "models" / "vargbot_tfidf_v2.joblib"),
))
GATE = float(os.getenv("VARGBOT_TFIDF_MIN_CONF", "0.55"))
EXPECTED_DOMAINS = 14
MIN_CORRECT = 9  # of the 11 above-gate cases below

# (text, expected domain) — canonical inputs covering every domain family,
# including Hinglish. Keep in sync with the serving smoke expectations.
CASES = [
    ("We supply industrial dyes and solvents to textile units in Surat", "RET1D"),
    ("Cement bricks aur TMT bars ka wholesale, Ghaziabad mein", "RET1C"),
    ("Generic medicines aur surgical gloves ki supply karte hain", "RET19"),
    ("Hum catering food aur snacks banate hain, tiffin service bhi", "RET11"),
    ("Mixer grinder and ceiling fan repair and sales shop", "RET15"),
    ("Ayurvedic supplements and protein powder distributor", "RET18"),
    ("Handmade brass handicrafts and home decor items from Moradabad", "RET16"),
    ("Ladies kurtis aur sarees ki manufacturing", "RET12"),
    ("Wooden educational toys for children", "RET17"),
    ("Mobile phone accessories and chargers wholesale", "RET14"),
    ("Car brake pads and clutch plates manufacturer", "RET1A"),
]

# Ambiguous text MUST stay below the gate (serving hands it to the LLM chain)
BELOW_GATE_CASES = [
    "Fresh vegetables and kirana store",
]


def main() -> int:
    failures = []

    if not ARTIFACT.exists():
        print(f"FAIL artifact missing: {ARTIFACT}")
        return 1
    model = joblib.load(ARTIFACT)

    n_classes = len(model.classes_)
    if n_classes != EXPECTED_DOMAINS:
        failures.append(f"domain coverage: expected {EXPECTED_DOMAINS} classes, got {n_classes}")

    correct = 0
    for text, want in CASES:
        proba = model.predict_proba([text])[0]
        got = model.classes_[proba.argmax()]
        conf = float(proba.max())
        ok = got == want and conf >= GATE
        correct += ok
        print(f"{'OK  ' if ok else 'MISS'} {want} -> {got} ({conf:.2f})  {text[:50]}")
    if correct < MIN_CORRECT:
        failures.append(f"canonical cases: {correct}/{len(CASES)} above-gate correct (need >= {MIN_CORRECT})")

    for text in BELOW_GATE_CASES:
        conf = float(model.predict_proba([text])[0].max())
        if conf >= GATE:
            failures.append(f"gate check: '{text}' scored {conf:.2f} — expected below gate {GATE}")
        else:
            print(f"OK   below-gate ({conf:.2f})  {text}")

    if failures:
        print("\nSMOKE TEST FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"\nSMOKE TEST PASSED: {n_classes} domains, {correct}/{len(CASES)} canonical cases, gate behaviour intact")
    return 0


if __name__ == "__main__":
    sys.exit(main())
