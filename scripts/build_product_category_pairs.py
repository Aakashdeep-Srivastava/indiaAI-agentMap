"""Build product -> ONDC-domain training pairs for VargBot from the Flipkart 20K dataset.

Source: data/raw/flipkart/flipkart_20k.csv (PromptCloudHQ Flipkart products,
CC BY-SA 4.0, via HuggingFace mirror — see data/raw/flipkart/SOURCE.md).

Each Flipkart root category is mapped to an official ONDC RET domain code
(data/processed/ondc_taxonomy.json). Rows whose root category is not in the
mapping (long-tail product-name junk roots, eBooks, etc.) are DROPPED and
counted in the report — no silent truncation.

Output:
  data/processed/product_category_pairs.csv
    columns: product_id, product_name, description, flipkart_root,
             flipkart_leaf, ondc_domain
  stdout: per-domain class distribution (skew is mitigated at TRAINING time
          via class weights / stratified sampling, not by dropping data here).

Run from repo root: python scripts/build_product_category_pairs.py
"""
import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "raw" / "flipkart" / "flipkart_20k.csv"
OUT = ROOT / "data" / "processed" / "product_category_pairs.csv"

csv.field_size_limit(10_000_000)

# Flipkart root category -> official ONDC RET domain.
# Leaf-list justification: RET13 compliance list includes 'Trimmer' (personal
# care appliances); RET16 home list includes 'Stationery', 'Toys and Games',
# 'Sports and Fitness Equipment'; RET10 grocery list includes 'Pet Care' and
# baby-care categories.
ROOT_TO_DOMAIN = {
    "Clothing": "RET12",
    "Jewellery": "RET12",
    "Footwear": "RET12",
    "Bags, Wallets & Belts": "RET12",
    "Watches": "RET12",
    "Sunglasses": "RET12",
    "Eyewear": "RET12",
    "Mobiles & Accessories": "RET14",
    "Computers": "RET14",
    "Cameras & Accessories": "RET14",
    "Gaming": "RET14",
    "Home Entertainment": "RET14",
    "Automotive": "RET1A",
    "Home Decor & Festive Needs": "RET16",
    "Home Furnishing": "RET16",
    "Furniture": "RET16",
    "Kitchen & Dining": "RET16",
    "Home & Kitchen": "RET16",
    "Home Improvement": "RET16",
    "Pens & Stationery": "RET16",
    "Sports & Fitness": "RET16",
    "Beauty and Personal Care": "RET13",
    "Health & Personal Care Appliances": "RET13",
    "Baby Care": "RET10",
    "Pet Supplies": "RET10",
    "Tools & Hardware": "RET1B",
    "Toys & School Supplies": "RET17",
}


def parse_tree(tree: str) -> tuple[str, str]:
    """Return (root, leaf) from a product_category_tree string."""
    cleaned = tree.strip().strip('[]"')
    parts = [p.strip() for p in cleaned.split(">>") if p.strip()]
    if not parts:
        return "", ""
    return parts[0], parts[-1]


def clean_text(text: str, limit: int = 1000) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[:limit]


def main() -> None:
    kept, dropped = [], Counter()
    with SRC.open(encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            root, leaf = parse_tree(row.get("product_category_tree", ""))
            domain = ROOT_TO_DOMAIN.get(root)
            if not domain:
                dropped[root] += 1
                continue
            kept.append({
                "product_id": row.get("pid", "").strip(),
                "product_name": clean_text(row.get("product_name", ""), 200),
                "description": clean_text(row.get("description", "")),
                "flipkart_root": root,
                "flipkart_leaf": leaf,
                "ondc_domain": domain,
            })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(kept[0].keys()))
        w.writeheader()
        w.writerows(kept)

    dist = Counter(r["ondc_domain"] for r in kept)
    n_drop = sum(dropped.values())
    print(f"kept: {len(kept)}  dropped: {n_drop} rows across {len(dropped)} unmapped roots")
    print("class distribution (skew handled at training time):")
    for dom, c in dist.most_common():
        print(f"  {dom}: {c}")
    print("top dropped roots:", dropped.most_common(5))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
