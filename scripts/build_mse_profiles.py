"""Generate 5K MSE profiles on the real TEAM-portal 27-field schema.

Seed data (REAL, Government Open Data License - India):
  - data/raw/aikosh/list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra_sample100k.csv
    (100K real Udyog Aadhaar units: name, gender, social category, org type,
     district, PIN, NIC5, employment, investment)
  - data/raw/udyam/district_wise_msme.csv (788 districts, national micro/small counts)

What is REAL per profile: enterprise name, entrepreneur attrs (gender, social
category, PH), org type, NIC code, employment, investment, major activity —
sampled from real units whose NIC maps to an ONDC retail domain.
What is SYNTHETIC: udyam_no (format-valid, fake), mobile, geography for the
share re-assigned to non-MH states (drawn from the real national district
distribution), product free-text descriptions (EN/Hinglish/HI templates), and
TEAM business-attribute fields. ondc_domain label derives from the REAL NIC code.

Output: data/processed/mse_profiles_5k.csv (+ .meta.json with provenance)
Run from repo root: python scripts/build_mse_profiles.py
"""
import csv
import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNITS = ROOT / "data" / "raw" / "aikosh" / "list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra_sample100k.csv"
DISTRICTS = ROOT / "data" / "raw" / "udyam" / "district_wise_msme.csv"
OUT = ROOT / "data" / "processed" / "mse_profiles_5k.csv"
META = ROOT / "data" / "processed" / "mse_profiles_5k.meta.json"

N = 5000
SEED = 20260707
csv.field_size_limit(10_000_000)

# NIC-2008 division/group -> ONDC RET domain (product-mappable codes only).
NIC_TO_DOMAIN = {
    "10": "RET10", "11": "RET10",              # food & beverage manufacturing
    "13": "RET12", "14": "RET12", "15": "RET12",  # textiles, apparel, leather
    "16": "RET16", "17": "RET16", "18": "RET16",  # wood, paper, printing
    "20": "RET13", "21": "RET19",              # chemicals (soaps/cosmetics), pharma
    "22": "RET16", "23": "RET1C",              # rubber/plastic household, construction
    "24": "RET1B", "25": "RET1B", "28": "RET1B",  # metals, fabricated metal, machinery
    "26": "RET14", "27": "RET15",              # electronics, electrical appliances
    "29": "RET1A", "30": "RET1A",              # vehicles, transport equipment
    "31": "RET16",                              # furniture
    "56": "RET11",                              # food & beverage services
}
NIC3_TO_DOMAIN = {"321": "RET12", "322": "RET16", "323": "RET16", "324": "RET17", "325": "RET18"}
NIC47_TO_DOMAIN = {  # retail trade groups
    "471": "RET10", "472": "RET10", "474": "RET14", "475": "RET16",
    "476": "RET16", "477": "RET12", "478": "RET10",
}

PRODUCTS = {
    "RET10": ["atta", "masala powders", "pickles", "namkeen", "papad", "jaggery", "spices", "ghee", "dry fruits"],
    "RET11": ["tiffin meals", "sweets", "bakery items", "snacks", "beverages", "catering food"],
    "RET12": ["cotton sarees", "kurtis", "leather footwear", "kids garments", "denim jeans", "artificial jewellery", "handbags"],
    "RET13": ["herbal soaps", "hair oil", "face creams", "attar perfumes", "ayurvedic cosmetics"],
    "RET14": ["mobile accessories", "LED lights", "speakers", "CCTV cameras", "computer peripherals"],
    "RET15": ["mixer grinders", "fans", "water purifiers", "irons", "kitchen appliances"],
    "RET16": ["wooden furniture", "home decor items", "brass handicrafts", "cookware", "bedsheets", "curtains", "stationery"],
    "RET17": ["soft toys", "educational toys", "board games", "wooden toys"],
    "RET18": ["ayurvedic medicines", "health supplements", "herbal products", "fitness equipment"],
    "RET19": ["generic medicines", "surgical supplies", "medical devices"],
    "RET1A": ["auto spare parts", "two-wheeler accessories", "engine components", "car care products"],
    "RET1B": ["hand tools", "fasteners", "steel fabrication", "industrial fittings", "machine parts"],
    "RET1C": ["cement blocks", "tiles", "paints", "sanitary fittings", "electrical wiring"],
}

TEMPLATES = [
    "We manufacture {p1} and {p2} in {city}. Supplying to local shops and traders for over {yrs} years.",
    "Small unit making {p1}, {p2} and {p3}. Quality products at wholesale rates.",
    "{name} is a {etype} enterprise producing {p1}. We want to sell online across India.",
    "Hum {city} mein {p1} aur {p2} banate hain. Achhi quality, sahi daam. Online bechna chahte hain.",
    "Humari unit {p1} banati hai. {yrs} saal se yeh kaam kar rahe hain, ab ONDC pe aana hai.",
    "हम {p1} और {p2} बनाते हैं। हमारा काम {city} में है और हम ऑनलाइन बेचना चाहते हैं।",
]

STATE_ABBR = {
    "MAHARASHTRA": "MH", "UTTAR PRADESH": "UP", "TAMIL NADU": "TN", "GUJARAT": "GJ",
    "RAJASTHAN": "RJ", "KARNATAKA": "KA", "MADHYA PRADESH": "MP", "BIHAR": "BR",
    "WEST BENGAL": "WB", "TELANGANA": "TG", "ANDHRA PRADESH": "AP", "KERALA": "KL",
    "PUNJAB": "PB", "HARYANA": "HR", "ODISHA": "OD", "JHARKHAND": "JH", "DELHI": "DL",
    "ASSAM": "AS", "CHHATTISGARH": "CG", "UTTARAKHAND": "UK", "HIMACHAL PRADESH": "HP",
    "JAMMU AND KASHMIR": "JK", "GOA": "GA", "TRIPURA": "TR", "MANIPUR": "MN",
    "MEGHALAYA": "ML", "NAGALAND": "NL", "MIZORAM": "MZ", "SIKKIM": "SK",
    "ARUNACHAL PRADESH": "AR", "PUDUCHERRY": "PY", "CHANDIGARH": "CH",
}

LANGS = ["hi", "en", "mr", "ta", "te", "kn", "gu", "bn"]


def parse_nic5(raw: str) -> str:
    """Extract the NIC code from strings like ' 1) 79110' (enumeration prefix)."""
    groups = re.findall(r"\d{4,5}", raw or "")
    return groups[0] if groups else ""


def nic_to_domain(nic5: str) -> str | None:
    nic5 = parse_nic5(nic5)
    if len(nic5) < 4:
        return None
    if len(nic5) == 4:  # some records carry 4-digit classes; pad for prefix logic
        nic5 = nic5 + "0"
    if nic5[:2] == "32":
        return NIC3_TO_DOMAIN.get(nic5[:3])
    if nic5[:2] == "47":
        return NIC47_TO_DOMAIN.get(nic5[:3], "RET10")
    return NIC_TO_DOMAIN.get(nic5[:2])


def load_units() -> list[dict]:
    units = []
    with UNITS.open(encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            if r.get("EnterpriseType") not in ("Micro", "Small"):
                continue  # TEAM eligibility: Micro & Small only
            domain = nic_to_domain(r.get("NIC5DigitCode", ""))
            if not domain:
                continue
            r["_domain"] = domain
            units.append(r)
    return units


def load_district_weights() -> list[tuple[str, str, int]]:
    rows = []
    with DISTRICTS.open(encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            try:
                weight = int(float(r.get("micro", 0) or 0)) + int(float(r.get("small", 0) or 0))
            except ValueError:
                continue
            if weight > 0:
                rows.append((r["state_name"].strip().upper(), r["district_name"].strip().title(), weight))
    return rows


def main() -> None:
    rng = random.Random(SEED)
    units = load_units()
    districts = load_district_weights()
    dist_weights = [w for _, _, w in districts]
    print(f"eligible real units (Micro/Small, NIC-mappable): {len(units)}")

    sample = rng.sample(units, N)
    profiles = []
    for i, u in enumerate(sample, start=1):
        domain = u["_domain"]
        # Geography: national redistribution from the real district distribution.
        state, district, _ = rng.choices(districts, weights=dist_weights, k=1)[0]
        abbr = STATE_ABBR.get(state, "XX")
        prods = rng.sample(PRODUCTS[domain], min(3, len(PRODUCTS[domain])))
        name = (u.get("EnterpriseName") or "").strip().title()
        desc = rng.choice(TEMPLATES).format(
            p1=prods[0], p2=prods[1 % len(prods)], p3=prods[2 % len(prods)],
            city=district, yrs=rng.randint(2, 20), name=name, etype=u["EnterpriseType"].lower(),
        )
        try:
            investment = float(u.get("InvestmentCost") or 0)
        except ValueError:
            investment = 0.0
        profiles.append({
            "mse_id": f"MSE-{i:05d}",
            "udyam_no": f"UDYAM-{abbr}-{rng.randint(1, 34):02d}-{rng.randint(1, 9_999_999):07d}",
            "enterprise_name": name,
            "org_type": u.get("OrganisationType", "Proprietary"),
            "gender_owner": u.get("Gender", ""),
            "social_category": u.get("SocialCategory", ""),
            "specially_abled": u.get("PH", "No"),
            "state": state.title(),
            "district": district,
            "pin_code": f"{rng.randint(110001, 855999)}",
            "nic_5digit": parse_nic5(u.get("NIC5DigitCode", "")),
            "major_activity": u.get("MajorActivity", ""),
            "classification": u.get("EnterpriseType", ""),
            "employees": u.get("TotalEmp", ""),
            "investment_lakh": investment,
            "description": desc,
            "products": "|".join(prods),
            "ondc_domain": domain,          # ground-truth label from the REAL NIC code
            "b2b_or_b2c": rng.choices(["B2C", "B2B", "Both"], weights=[6, 2, 2])[0],
            "current_business_state": rng.choices(["Only offline", "Both", "Only online"], weights=[7, 2, 1])[0],
            "has_gstin": rng.choices(["Yes", "No"], weights=[4, 6])[0],
            "has_pan": rng.choices(["Yes", "No"], weights=[8, 2])[0],
            "has_catalogue": rng.choices(["Yes", "No"], weights=[3, 7])[0],
            "has_devices": rng.choices(["Yes", "No"], weights=[8, 2])[0],
            "has_printer": rng.choices(["Yes", "No"], weights=[3, 7])[0],
            "workshop_interest": rng.choices(["Yes", "No"], weights=[7, 3])[0],
            "language": rng.choices(LANGS, weights=[35, 20, 10, 8, 7, 7, 7, 6])[0],
            "mobile_number": f"9{rng.randint(100000000, 999999999)}",
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(profiles[0].keys()))
        w.writeheader()
        w.writerows(profiles)

    dom = Counter(p["ondc_domain"] for p in profiles)
    gender = Counter(p["gender_owner"] for p in profiles)
    meta = {
        "generated": "2026-07-07", "seed": SEED, "count": N,
        "real_fields": ["enterprise_name", "org_type", "gender_owner", "social_category",
                        "specially_abled", "nic_5digit", "major_activity", "classification",
                        "employees", "investment_lakh"],
        "synthetic_fields": ["udyam_no", "mobile_number", "pin_code", "state", "district",
                             "description", "products", "b2b_or_b2c", "current_business_state",
                             "has_*", "workshop_interest", "language"],
        "label_derivation": "ondc_domain from REAL NIC-2008 code via NIC_TO_DOMAIN mapping",
        "geography": "redistributed nationally, weighted by real district-wise Udyam micro+small counts",
        "gender_note": ("real-world Udyog Aadhaar gender distribution preserved (not the TEAM 50% "
                        "women aspiration): " + json.dumps(dict(gender))),
        "domain_distribution": dict(dom.most_common()),
        "sources": [str(UNITS.relative_to(ROOT)), str(DISTRICTS.relative_to(ROOT))],
    }
    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    print("domain distribution:", dict(dom.most_common()))
    print("gender:", dict(gender))
    print(f"wrote {OUT}")
    print(f"wrote {META}")


if __name__ == "__main__":
    main()
