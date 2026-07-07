"""Seed Supabase with the real data foundation via the REST API.

- Full ONDC taxonomy: 14 domains + all leaf categories (data/processed/ondc_taxonomy.json)
- 281 real SNPs from the ONDC live-network registry (data/processed/snp_profiles.json)
- 5K MSE profiles built from real Udyog Aadhaar unit lists (data/processed/mse_profiles_5k.csv)

Idempotent: uses on_conflict=ignore-duplicates on natural keys.
Run:  python scripts/seed_real_data.py <SUPABASE_URL> <ANON_KEY>
(Requires tables to be writable by anon — run BEFORE enabling RLS, or use a
service key. The repo flow enables RLS immediately after seeding.)
"""

import csv
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "processed"

URL, KEY = sys.argv[1].rstrip("/"), sys.argv[2]
NOW = datetime.now(timezone.utc).isoformat()


def rest(method: str, table: str, payload=None, params: str = ""):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}{params}",
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read().decode()
        return json.loads(body) if body else None


def get(table: str, params: str):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}{params}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def clean(s):
    if s is None:
        return None
    # Repair a known build artifact where "Oil" was mangled to "Falseil" etc.
    return str(s).replace("Falseil", "Oil").replace("Trueil", "Oil").strip()


# ── 1. Domains ─────────────────────────────────────────────────────────
tax = json.loads((DATA / "ondc_taxonomy.json").read_text(encoding="utf-8"))
domains = [{"code": d["code"], "name": clean(d["name"])} for d in tax["domains"]]
rest("POST", "ondc_domains", domains, "?on_conflict=code")
dom_rows = get("ondc_domains", "?select=id,code")
dom_id = {r["code"]: r["id"] for r in dom_rows}
print(f"domains: {len(dom_rows)} in table")

# ── 2. Leaf categories ─────────────────────────────────────────────────
cats = []
for code, block in tax["categories"].items():
    if code not in dom_id:
        continue
    for i, leaf in enumerate(block.get("leaf_categories", []), start=1):
        name = clean(leaf["name"])
        if not name:
            continue
        cats.append({
            "domain_id": dom_id[code],
            "code": f"{code}-L{i:03d}",
            "name": name[:300],
        })
for i in range(0, len(cats), 500):
    rest("POST", "ondc_categories", cats[i:i + 500], "?on_conflict=code")
print(f"categories: prepared {len(cats)}")

# ── 3. Real SNPs ───────────────────────────────────────────────────────
snp_doc = json.loads((DATA / "snp_profiles.json").read_text(encoding="utf-8"))
snps = []
for p in snp_doc["profiles"]:
    domain_codes = ",".join(p.get("domain_codes") or [])[:200]
    snps.append({
        "subscriber_id": p["snp_id"],
        "name": clean(p["name"])[:300],
        "domain_codes": domain_codes,
        "geo_coverage": ",".join(p.get("geo_coverage") or [])[:500],
        "commission_pct": p.get("commission_pct") or 0.0,
        "min_order_value": 0.0,
        "languages_supported": ",".join(p.get("languages_supported") or ["en"])[:200],
        "rating": p.get("rating") or 0.0,
        "onboarding_support": p.get("onboarding_support") or "partial",
    })
for i in range(0, len(snps), 200):
    rest("POST", "snps", snps[i:i + 200], "?on_conflict=subscriber_id")
print(f"snps: prepared {len(snps)}")

# ── 4. 5K MSE profiles ────────────────────────────────────────────────
BAND = {"micro": "micro", "small": "small", "medium": "medium"}
mses, seen = [], set()
with open(DATA / "mse_profiles_5k.csv", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        udyam = row["udyam_no"].strip()
        if not udyam or udyam in seen:
            continue
        seen.add(udyam)
        mses.append({
            "udyam_number": udyam[:30],
            "name": clean(row["enterprise_name"])[:300],
            "description": row["description"].strip(),
            "district": clean(row["district"])[:100] or None,
            "state": clean(row["state"])[:100] or None,
            "pin_code": row["pin_code"].strip()[:10] or None,
            "nic_code": row["nic_5digit"].strip()[:10] or None,
            "language": (row["language"].strip() or "en")[:10],
            "turnover_band": BAND.get(row["classification"].strip().lower()),
            "mobile_number": row["mobile_number"].strip()[:15] or None,
            "products": ", ".join(x.strip() for x in row["products"].split("|") if x.strip()) or None,
            "consent_given": True,   # synthetic demo corpus
            "consent_at": NOW,
        })
for i in range(0, len(mses), 500):
    rest("POST", "mses", mses[i:i + 500], "?on_conflict=udyam_number")
    print(f"  mses: {min(i + 500, len(mses))}/{len(mses)}")
print(f"mses: prepared {len(mses)} (deduped from CSV)")

print("Done.")
