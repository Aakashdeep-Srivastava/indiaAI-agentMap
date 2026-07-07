"""Process the MEPMA SHG ONDC datasets (AIKosh) into training/matching artifacts.

Source (AIKosh dataset 9b824755-f646-4e7b-bae9-f3bd1f900511, downloaded via
the official `aikosh` SDK on 2026-07-07):
  - ONDC-MyStore_App_Products_Orders.xlsx  (9,071 real SHG products with
    seller-entered categories + district; 2,062 order aggregates)
  - ONDC-WowGeni_App_Orders.xlsx           (137,536 real ONDC order lines)

Why this matters for PS2: the seller-entered categories are inconsistent
("Jewellary", "Floor cleners", "Food"/"food"/"Food ") — the exact
"inconsistent product category tagging" pain point in the problem statement.
We keep the RAW category verbatim and add a normalized ONDC domain label.

Outputs:
  data/processed/mepma_product_pairs.csv      product -> raw category -> RET domain
  data/processed/snp_transaction_history.csv  per-seller REAL order stats (WowGeni)

Run from repo root: python scripts/build_mepma_artifacts.py
"""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "aikosh"
OUT_PAIRS = ROOT / "data" / "processed" / "mepma_product_pairs.csv"
OUT_TXN = ROOT / "data" / "processed" / "snp_transaction_history.csv"

# Raw seller-entered category -> official ONDC RET domain.
# 'Detergents and Dishwash' and household cleaning sit under RET10 per the
# ONDC compliance grocery list; jewellery/handlooms/kids-wear under RET12.
CATEGORY_TO_DOMAIN = {
    "home décor": "RET16",
    "home decor": "RET16",
    "jewellary": "RET12",
    "jewellery": "RET12",
    "fashion": "RET12",
    "kitchen": "RET16",
    "pooja": "RET16",
    "hand looms": "RET12",
    "food": "RET10",
    "disposable": "RET16",
    "floor cleners": "RET10",
    "floor cleaners": "RET10",
    "kids": "RET12",
    "beauty": "RET13",
    "home needs": "RET16",
    "agriculture": "AGR",
}


def main() -> None:
    xl = pd.ExcelFile(RAW / "ONDC-MyStore_App_Products_Orders.xlsx")
    prod = xl.parse("Products").rename(columns=lambda c: c.strip())
    prod["raw_category"] = prod["Category"].fillna("").astype(str).str.strip()
    prod["ondc_domain"] = (
        prod["raw_category"].str.lower().map(CATEGORY_TO_DOMAIN)
        .fillna(prod["raw_category"].map(lambda c: "MISSING" if not c else "UNMAPPED"))
    )
    pairs = prod.rename(columns={
        "Name of the product": "product_name", "Dist": "district",
    })[["product_name", "raw_category", "ondc_domain", "district"]]
    pairs.to_csv(OUT_PAIRS, index=False, encoding="utf-8")

    unmapped = (pairs["ondc_domain"] == "UNMAPPED").sum()
    print(f"MEPMA product pairs: {len(pairs)} (unmapped: {unmapped})")
    print(pairs["ondc_domain"].value_counts().to_string())

    w = pd.ExcelFile(RAW / "ONDC-WowGeni_App_Orders.xlsx").parse("Sheet1")
    w = w.rename(columns=lambda c: c.strip())
    w["final_price"] = pd.to_numeric(w["final_price"], errors="coerce")
    txn = (
        w.groupby("Seller Name")
        .agg(
            total_orders=("Order id", "nunique"),
            total_lines=("S No", "count"),
            total_value=("final_price", "sum"),
            avg_order_value=("final_price", "mean"),
            distinct_products=("Product Name", "nunique"),
            distinct_cities=("city", "nunique"),
        )
        .round(2)
        .reset_index()
        .rename(columns={"Seller Name": "seller_name"})
        .sort_values("total_orders", ascending=False)
    )
    txn.to_csv(OUT_TXN, index=False, encoding="utf-8")
    print(f"\nseller transaction history: {len(txn)} sellers, "
          f"{int(txn['total_lines'].sum())} order lines")
    print(txn.head(5).to_string(index=False))
    print(f"\nwrote {OUT_PAIRS}\nwrote {OUT_TXN}")


if __name__ == "__main__":
    main()
