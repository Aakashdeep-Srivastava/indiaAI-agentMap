"""Build real SNP profiles from the public ONDC live-network registry.

Source: https://www.ondc.org/content/files/theme/json/livenetwork_v91.json
(public, no auth; retrieved 2026-07-07 -> data/raw/ondc/livenetwork_v91.json)

REAL fields (from the registry): name, np_type, node_type (MSN/ISN), tsp,
domains (mapped to official RET codes), geo coverage (cities / Pan-India).

SYNTHETIC fields (NOT in any public source; generated with a fixed seed and
flagged in the output): commission_pct, rating, capacity_score,
avg_onboarding_days, onboarding_support, languages_supported.
These stand in for TEAM-portal operational data (capacity, transaction
history) that is not public; Stage-2 integration would replace them.

Output: data/processed/snp_profiles.json + snp_profiles.csv
Run from repo root: python scripts/build_snp_profiles.py
"""
import csv
import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "raw" / "ondc" / "livenetwork_v91.json"
OUT_JSON = ROOT / "data" / "processed" / "snp_profiles.json"
OUT_CSV = ROOT / "data" / "processed" / "snp_profiles.csv"

SEED = 20260707  # fixed for reproducibility

# ONDC subdomain label -> official RET domain code (per ondc_taxonomy.json)
DOMAIN_MAP = {
    "grocery": "RET10",
    "f&b": "RET11",
    "food & beverages": "RET11",
    "fashion": "RET12",
    "beauty & personal care": "RET13",
    "bpc": "RET13",
    "electronics": "RET14",
    "electronics & appliances": "RET14",
    "appliances": "RET15",
    "home & kitchen": "RET16",
    "home & decor": "RET16",
    "toys & games": "RET17",
    "health & wellness": "RET18",
    "pharma": "RET19",
    "auto components & accessories": "RET1A",
    "autoparts & components": "RET1A",
    "hardware & industrial equipment": "RET1B",
    "buildings & construction supplies": "RET1C",
    "retail": "RET-MULTI",   # generic retail, domain unspecified
    "retail (b2c)": "RET-MULTI",
    "retail (b2b)": "RET-MULTI",
    "b2b": "RET-MULTI",
    "agriculture": "AGR",
    "agri-input": "AGR",
}

SUPPORT_LEVELS = ["full", "partial", "none"]
LANG_POOL = ["en", "hi", "ta", "te", "kn", "ml", "mr", "gu", "bn", "pa", "or", "as"]


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", "", value or "").strip()
    m = re.search(r"https?://\S+", value or "")
    return m.group(0).rstrip('"\'>') if m else text


def parse_domains(subdomain: str) -> tuple[list[str], list[str]]:
    """Return (ret_codes, unmapped_labels) from the registry's subdomain string."""
    ret, other = [], []
    for part in re.split(r"[,;/]", subdomain or ""):
        label = part.strip()
        if not label:
            continue
        code = DOMAIN_MAP.get(label.lower())
        if code and code not in ret:
            ret.append(code)
        elif not code:
            other.append(label)
    return ret, other


def parse_geo(cities: str) -> tuple[list[str], str]:
    """Return (city_list, serviceability) from the registry's cities string."""
    raw = (cities or "").strip()
    if not raw:
        return [], "unknown"
    if re.search(r"pan\s*india|all\s*india", raw, re.I):
        return ["Pan India"], "12"  # ONDC serviceability: Pan-India
    city_list = [c.strip() for c in re.split(r"[,;/]", raw) if c.strip()]
    return city_list, "11"  # Intercity


def main() -> None:
    rng = random.Random(SEED)
    records = json.loads(SRC.read_text(encoding="utf-8"))

    sellers = [r for r in records
               if "Seller" in r.get("nptype", "") and "Logistics" not in r.get("nptype", "")]

    profiles = []
    for i, r in enumerate(sellers, start=1):
        ret_domains, other_domains = parse_domains(r.get("subdomain", ""))
        cities, serviceability = parse_geo(r.get("cities", ""))
        in_team_scope = bool(ret_domains) and ret_domains != ["AGR"]

        profiles.append({
            "snp_id": f"SNP-{i:04d}",
            "name": (r.get("sellername") or "").strip(),
            "np_type": r.get("nptype", ""),
            "node_type": r.get("msn") or None,            # MSN / ISN
            "tsp": (r.get("tsp") or "").strip() or None,  # tech service provider
            "website": strip_html(r.get("website", "")) or None,
            "domain_codes": ret_domains,
            "domain_labels_unmapped": other_domains,
            "geo_coverage": cities,
            "serviceability_type": serviceability,
            "in_team_scope": in_team_scope,
            # ---- synthetic operational fields (see module docstring) ----
            "commission_pct": round(rng.uniform(2.0, 12.0), 1),
            "rating": round(rng.uniform(3.0, 5.0), 1),
            "capacity_score": round(rng.uniform(0.3, 1.0), 2),
            "avg_onboarding_days": rng.randint(3, 21),
            "onboarding_support": rng.choice(SUPPORT_LEVELS),
            "languages_supported": sorted(rng.sample(LANG_POOL, rng.randint(2, 6))),
        })

    synthetic_fields = ["commission_pct", "rating", "capacity_score",
                        "avg_onboarding_days", "onboarding_support", "languages_supported"]
    out = {
        "meta": {
            "source": "https://www.ondc.org/content/files/theme/json/livenetwork_v91.json",
            "retrieved": "2026-07-07",
            "total_registry_records": len(records),
            "seller_side_records": len(sellers),
            "team_scope_records": sum(p["in_team_scope"] for p in profiles),
            "synthetic_fields": synthetic_fields,
            "synthetic_seed": SEED,
            "note": ("Fields listed in synthetic_fields are generated placeholders for "
                     "non-public TEAM operational data and must be disclosed as such."),
        },
        "profiles": profiles,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    cols = ["snp_id", "name", "np_type", "node_type", "tsp", "website", "domain_codes",
            "domain_labels_unmapped", "geo_coverage", "serviceability_type", "in_team_scope",
            *synthetic_fields]
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in profiles:
            row = dict(p)
            for k in ("domain_codes", "domain_labels_unmapped", "geo_coverage", "languages_supported"):
                row[k] = "|".join(row[k]) if row[k] else ""
            w.writerow(row)

    from collections import Counter
    dom_counts = Counter(code for p in profiles for code in p["domain_codes"])
    print(f"seller-side NPs: {len(sellers)}  |  in TEAM scope: {out['meta']['team_scope_records']}")
    print("domain distribution:", dict(dom_counts.most_common()))
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_CSV}")


if __name__ == "__main__":
    main()
