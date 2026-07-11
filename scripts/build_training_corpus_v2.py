"""Build VargBot training corpus v2 — every dataset we have, used efficiently.

Sources (all labelled with ONDC domain codes):
  1. flipkart    — 19.6K real product listings (8 domains, product-listing style)
  2. mepma       — 9K real SHG-seller product names from MEPMA Andhra (labels
                   MISSING/AGR dropped)
  3. mse_profile — 5K real-derived MSE profiles: Hinglish business descriptions
                   + product lists (13 domains — the actual serving distribution)
  4. synthetic   — template-generated MSE-style text ONLY for domains that stay
                   thin after 1-3: RET15, RET17, RET18, RET19, RET1C, RET1D.
                   Vocab from ondc_taxonomy.json leaf names + curated item lists.

Output: data/processed/training_corpus_v2.csv  (text, ondc_domain, source)
The `source` column lets the trainer report real-data-only metrics separately —
synthetic twins inflate random-split test scores and we disclose that honestly.
"""

import csv
import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
SEED = 20260711
rng = random.Random(SEED)

# ── Synthetic vocab ────────────────────────────────────────────────────
# Curated to be domain-discriminative: construction materials (RET1C) vs
# hand tools (RET1B) vs home furnishing (RET16); prescription/clinical
# (RET19) vs consumer wellness (RET18); industrial chemicals (RET1D) vs
# household cleaners (RET10).
ITEMS: dict[str, list[str]] = {
    "RET15": [
        "refrigerators", "washing machines", "air conditioners", "microwave ovens",
        "mixer grinders", "ceiling fans", "water heaters", "geysers", "air coolers",
        "induction cooktops", "kitchen chimneys", "water purifiers", "juicers",
        "toasters", "electric kettles", "electric irons", "vacuum cleaners",
        "dishwashers", "room heaters", "exhaust fans", "wet grinders",
        "voltage stabilizers", "sewing machines", "table fans",
    ],
    "RET17": [
        "soft toys", "educational toys", "board games", "jigsaw puzzles",
        "remote control cars", "dolls", "building blocks", "wooden toys",
        "action figures", "toy kitchen sets", "ride-on toys", "rattles",
        "stuffed animals", "carrom boards", "chess sets", "playing cards",
        "kites", "spinning tops", "toy guns", "musical toys", "clay toys",
        "channapatna toys", "activity kits for kids",
    ],
    "RET18": [
        "ayurvedic supplements", "protein powder", "yoga mats", "chyawanprash",
        "herbal tea", "multivitamin tablets", "fitness equipment", "dumbbells",
        "resistance bands", "massage oils", "immunity boosters", "aloe vera juice",
        "wheatgrass powder", "flax seeds", "chia seeds", "green coffee",
        "apple cider vinegar", "herbal churna", "giloy juice", "amla juice",
        "orthopedic supports", "hot water bags", "acupressure mats",
        "meditation cushions", "wellness kits",
    ],
    "RET19": [
        "generic medicines", "paracetamol tablets", "antibiotic capsules",
        "cough syrups", "antacid syrups", "pain relief ointments",
        "prescription drugs", "insulin injections", "surgical gloves",
        "disposable syringes", "sterile bandages", "gauze rolls", "IV fluids",
        "blood pressure monitors", "glucometers", "digital thermometers",
        "nebulizers", "oxygen concentrators", "first aid kits",
        "homeopathy medicines", "unani medicines", "surgical masks",
        "antiseptic solutions", "medicine strips", "pharma formulations",
    ],
    "RET1C": [
        "cement", "red bricks", "fly ash bricks", "TMT bars", "steel rods",
        "river sand", "crushed stone aggregate", "concrete blocks",
        "floor tiles", "vitrified tiles", "marble slabs", "granite slabs",
        "plywood sheets", "shuttering plywood", "sanitaryware", "PVC pipes",
        "CPVC fittings", "wall putty", "wall paints", "primer", "POP sheets",
        "gypsum boards", "roofing sheets", "aluminium sections",
        "UPVC windows", "wooden doors", "waterproofing compounds",
        "construction chemicals", "ready mix concrete", "paver blocks",
    ],
    "RET1D": [
        "industrial chemicals", "dyes and pigments", "textile dyes",
        "organic solvents", "industrial adhesives", "epoxy resins",
        "caustic soda", "soda ash", "sulphuric acid", "hydrochloric acid",
        "detergent raw materials", "surfactants", "water treatment chemicals",
        "boiler chemicals", "laboratory reagents", "industrial coatings",
        "paint thinners", "polymer granules", "PVC resin", "master batches",
        "agrochemical formulations", "zinc oxide", "titanium dioxide",
        "sodium silicate", "industrial lubricant additives", "phenol",
        "formaldehyde resin", "electroplating chemicals",
    ],
}

# Domains whose taxonomy leaf names supplement the vocab
TAXONOMY_VOCAB_DOMAINS = ("RET15", "RET18")

CITIES = [
    "Moradabad", "Ludhiana", "Surat", "Tirupur", "Agra", "Kanpur", "Rajkot",
    "Coimbatore", "Jaipur", "Varanasi", "Bhadohi", "Panipat", "Karur",
    "Aligarh", "Firozabad", "Meerut", "Jalandhar", "Ahmedabad", "Indore",
    "Nagpur", "Hyderabad", "Vijayawada", "Guntur", "Hubli", "Salem",
    "Bhavnagar", "Vapi", "Ankleshwar", "Faridabad", "Ghaziabad",
]

EN_TEMPLATES = [
    "We manufacture {a} in {city}. Good quality, looking for online buyers.",
    "Wholesale supplier of {a} and {b} based in {city}.",
    "{a} manufacturing unit in {city}. B2B and B2C supply available.",
    "Small business selling {a}. We want to sell on ONDC.",
    "Our factory in {city} produces {a} and {b} for retailers across India.",
    "Trader and distributor of {a}. Bulk orders accepted.",
    "We are a {city} based enterprise dealing in {a} and {b}.",
    "Family business making {a} for over ten years. Interested in online selling.",
    "{a} and {b} available at wholesale rates. GST registered unit.",
    "Micro enterprise from {city} manufacturing {a}.",
]

HI_TEMPLATES = [
    "Hum {city} mein {a} banate hain. Achhi quality, sahi daam.",
    "{a} aur {b} ka wholesale karobar hai hamara.",
    "Meri dukaan mein {a} milta hai. Online bechna chahte hain.",
    "Hamari factory {a} banati hai. Bulk order le sakte hain.",
    "{city} se {a} ka supplier hoon. ONDC pe bechna hai.",
    "Hum {a} aur {b} ka kaam karte hain, 10 saal se.",
    "Chhota business hai {a} ka. Naye customer chahiye.",
    "{a} ki manufacturing unit hai {city} mein.",
]

LISTING_TEMPLATES = [
    "{a} - premium quality, wholesale price",
    "Best {a} and {b} for retail shops",
    "{a} pack, bulk supply, GST invoice",
]

SYNTH_TARGET = {
    "RET15": 700, "RET17": 450, "RET18": 700,
    "RET19": 750, "RET1C": 750, "RET1D": 800,
}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def load_flipkart(rows: list) -> None:
    with open(PROC / "product_category_pairs.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            dom = (row.get("ondc_domain") or "").strip()
            name = (row.get("product_name") or "").strip()
            desc = (row.get("description") or "").strip()[:600]
            if dom and name:
                rows.append((norm(f"{name}. {desc}"), dom, "flipkart"))


def load_mepma(rows: list) -> None:
    with open(PROC / "mepma_product_pairs.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            dom = (row.get("ondc_domain") or "").strip()
            name = (row.get("product_name") or "").strip()
            cat = (row.get("raw_category") or "").strip()
            if dom.startswith("RET") and name:
                text = f"{name}. {cat}" if cat else name
                rows.append((norm(text[:600]), dom, "mepma"))


def load_mse_profiles(rows: list) -> None:
    with open(PROC / "mse_profiles_5k.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            dom = (row.get("ondc_domain") or "").strip()
            desc = (row.get("description") or "").strip()
            prods = (row.get("products") or "").replace("|", ", ").strip()
            if dom.startswith("RET") and (desc or prods):
                text = f"{desc} Products: {prods}" if prods else desc
                rows.append((norm(text[:600]), dom, "mse_profile"))


def synth_vocab() -> dict[str, list[str]]:
    vocab = {k: list(v) for k, v in ITEMS.items()}
    tax = json.loads((PROC / "ondc_taxonomy.json").read_text(encoding="utf-8"))
    for dom in TAXONOMY_VOCAB_DOMAINS:
        leaves = [c["name"] for c in tax.get("categories", {}).get(dom, {}).get("leaf_categories", [])]
        vocab[dom].extend(l.lower() for l in leaves if 3 <= len(l) <= 60)
    return vocab


def build_synthetic(rows: list) -> None:
    vocab = synth_vocab()
    templates = [(t, "en") for t in EN_TEMPLATES] + \
                [(t, "hi") for t in HI_TEMPLATES] + \
                [(t, "listing") for t in LISTING_TEMPLATES]
    for dom, target in SYNTH_TARGET.items():
        items = vocab[dom]
        made = set()
        guard = 0
        while len(made) < target and guard < target * 20:
            guard += 1
            tpl, _ = rng.choice(templates)
            a = rng.choice(items)
            b = rng.choice(items)
            if a == b:
                continue
            text = norm(tpl.format(a=a, b=b, city=rng.choice(CITIES)))
            if text not in made:
                made.add(text)
                rows.append((text, dom, "synthetic"))


def main() -> None:
    rows: list[tuple[str, str, str]] = []
    load_flipkart(rows)
    load_mepma(rows)
    load_mse_profiles(rows)
    build_synthetic(rows)

    # Dedupe on lowercased text (keeps first occurrence — real sources load first)
    seen: set[str] = set()
    unique: list[tuple[str, str, str]] = []
    for text, dom, src in rows:
        key = text.lower()
        if key not in seen:
            seen.add(key)
            unique.append((text, dom, src))

    out = PROC / "training_corpus_v2.csv"
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["text", "ondc_domain", "source"])
        w.writerows(unique)

    by_dom = Counter(d for _, d, _ in unique)
    by_src = Counter(s for _, _, s in unique)
    print(f"rows: {len(unique)} (deduped from {len(rows)})")
    print("by source:", dict(by_src))
    print("by domain:")
    for dom in sorted(by_dom):
        srcs = Counter(s for _, d, s in unique if d == dom)
        print(f"  {dom}: {by_dom[dom]:6d}  {dict(srcs)}")


if __name__ == "__main__":
    main()
