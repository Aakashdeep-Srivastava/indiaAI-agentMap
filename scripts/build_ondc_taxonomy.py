"""Build the consolidated ONDC retail taxonomy for AgentMap AI (VargBot ground truth).

Sources (all fetched 2026-07-07, provenance tracked per domain):
1. ONDC-RET-Specifications release-2.0.2 api/components/enums/context.yaml  -> official domain codes
2. ONDC-RET-Specifications release-2.0.2 api/components/enums/category.yaml -> RET10 official category codes
3. ONDC-Official/log-validation-utility master constants/category.ts        -> compliance leaf categories
   (grocery/RET10, health/RET18, home/RET16, BPC/RET13, agriculture)
4. ONDC-Official/protocol-network-extension enums/retail/fashion/...        -> RET12 category tree + attributes
5. ONDC.org public catalog tree (via team research pack, 2026)              -> RET11/RET14/RET15 leaf lists

Output: data/processed/ondc_taxonomy.json
Run from repo root: python scripts/build_ondc_taxonomy.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "ondc"
OUT = ROOT / "data" / "processed" / "ondc_taxonomy.json"

RETRIEVED = "2026-07-07"


def parse_context_yaml(path: Path) -> list[dict]:
    """Extract official domain codes from context.yaml (simple line-based parse)."""
    domains = []
    code = None
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*-\s*code:\s*(ONDC:RET\S+)", line)
        if m:
            code = m.group(1)
            continue
        m = re.match(r"\s*description:\s*(.+)", line)
        if m and code:
            domains.append({"code": code.replace("ONDC:", ""), "name": m.group(1).strip()})
            code = None
    return domains


def parse_category_yaml(path: Path) -> list[dict]:
    """Extract official RET10 category codes from category.yaml."""
    cats = []
    code = None
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*-\s*code:\s*(RET1\S+)", line)
        if m:
            code = m.group(1)
            continue
        m = re.match(r"\s*description:\s*(.+)", line)
        if m and code:
            cats.append({"code": code, "name": m.group(1).strip()})
            code = None
    return cats


def parse_category_constants(path: Path) -> dict[str, list[str]]:
    """Extract leaf-category names per exported const from log-validation-utility category.ts."""
    text = path.read_text(encoding="utf-8")
    blocks = {}
    for m in re.finditer(r"export const (\w+)[^=]*=\s*\{(.*?)\n\}", text, re.S):
        name, body = m.group(1), m.group(2)
        keys = []
        for line in body.splitlines():
            km = re.match(r"\s*'([^']+)'\s*:", line) or re.match(r"\s*([A-Za-z][\w ]*?)\s*:\s*(?:\w+Obj|\{\})", line)
            if km:
                key = km.group(1).strip()
                if key not in ("mandatory", "value", "brand"):
                    keys.append(key)
        blocks[name] = keys
    return blocks


def parse_fashion_catalog(path: Path) -> list[dict]:
    """Flatten the fashion catalog tree into leaf categories with attribute names."""
    data = json.loads(path.read_text(encoding="utf-8"))["data"]
    leaves = []
    for row in data:
        leaves.append({
            "path": " > ".join(
                p for p in (row.get("super_category"), row.get("category"),
                            row.get("sub_category"), row.get("sub_sub_category")) if p
            ),
            "name": row.get("sub_sub_category") or row.get("sub_category") or row.get("category"),
            "attributes": [a["name"] for a in row.get("attributes", [])],
        })
    return leaves


def load_attribute_enums(enum_dir: Path) -> dict[str, list]:
    """Load all flat attribute enums from protocol-network-extension enums/retail/."""
    attrs = {}
    for f in sorted(enum_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and len(data) == 1:
            key, val = next(iter(data.items()))
            attrs[key] = val
    return attrs


# Leaf lists from the ONDC.org public catalog tree (team research pack, Part 3).
# Used only for domains not covered by a machine-readable official source.
CATALOG_TREE_LEAVES = {
    "RET11": ["Continental", "Middle Eastern", "North Indian", "Regional Indian",
              "South Indian", "Chinese", "Fast Food", "Desserts", "Bakery", "Beverages (F&B)"],
    "RET14": ["Audio", "Cameras & Camcorders", "Computer Peripherals", "Desktop & Laptops",
              "Gaming", "Mobile Phones", "Televisions", "Video", "Wearable Products",
              "Safety", "Security"],
    "RET15": ["Kitchen Appliances", "Refrigerators & Freezers", "Washing Machines & Accessories",
              "Water Purifiers & Coolers", "AC & Air Cleaners", "Lighting & Electric Fans",
              "Inverter & Stabilizer", "Vacuum Cleaners", "Heaters"],
}


def main() -> None:
    domains = parse_context_yaml(RAW / "ret-enums" / "context.yaml")
    ret10_codes = parse_category_yaml(RAW / "ret-enums" / "category.yaml")
    constants = parse_category_constants(RAW / "ret-enums" / "category_constants.ts")
    fashion = parse_fashion_catalog(
        RAW / "protocol-network-extension" / "enums" / "retail" / "fashion" / "fashion_catalogs_with_attributes.json")
    attributes = load_attribute_enums(RAW / "protocol-network-extension" / "enums" / "retail")

    const_to_domain = {
        "groceryJSON": ("RET10", "log-validation-utility"),
        "BPCJSON": ("RET13", "log-validation-utility"),
        "homeJSON": ("RET16", "log-validation-utility"),
        "healthJSON": ("RET18", "log-validation-utility"),
    }

    categories: dict[str, dict] = {}
    for const_name, (dom, source) in const_to_domain.items():
        leaves = constants.get(const_name, [])
        categories[dom] = {
            "source": source,
            "leaf_categories": [{"name": n} for n in leaves],
        }

    # RET10 also has the official coded taxonomy from the 2.0.2 spec.
    categories["RET10"]["official_codes"] = ret10_codes
    categories["RET10"]["official_codes_source"] = "ONDC-RET-Specifications release-2.0.2 category.yaml"

    categories["RET12"] = {
        "source": "protocol-network-extension fashion_catalogs_with_attributes.json",
        "leaf_categories": [{"name": l["name"], "path": l["path"], "attributes": l["attributes"]}
                            for l in fashion],
    }

    for dom, leaves in CATALOG_TREE_LEAVES.items():
        categories[dom] = {
            "source": "ondc.org public catalog tree (research pack 2026)",
            "leaf_categories": [{"name": n} for n in leaves],
        }

    taxonomy = {
        "meta": {
            "name": "ONDC Retail Taxonomy — AgentMap AI consolidated",
            "retrieved": RETRIEVED,
            "note": ("Official domain codes per ONDC-RET-Specifications context.yaml. "
                     "RET15=Appliances and RET16=Home & Decor per the official spec "
                     "(some secondary sources swap these — spec is authoritative)."),
            "sources": [
                "github.com/ONDC-Official/ONDC-RET-Specifications (release-2.0.2)",
                "github.com/ONDC-Official/log-validation-utility (master)",
                "github.com/ONDC-Official/protocol-network-extension (main)",
                "ondc.org public catalog tree via team research pack",
            ],
        },
        "domains": domains,
        "categories": categories,
        "agriculture_categories": {
            "source": "log-validation-utility (agriJSON)",
            "leaf_categories": [{"name": n} for n in constants.get("agriJSON", [])],
        },
        "attribute_enums": attributes,
        "serviceability_types": [
            {"code": "10", "name": "Hyperlocal", "unit": "km"},
            {"code": "11", "name": "Intercity", "unit": "pincode"},
            {"code": "12", "name": "Pan-India", "unit": "country"},
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(taxonomy, indent=2, ensure_ascii=False), encoding="utf-8")

    n_leaves = sum(len(c["leaf_categories"]) for c in categories.values())
    print(f"domains: {len(domains)}")
    for d in domains:
        cov = len(categories.get(d["code"], {}).get("leaf_categories", []))
        print(f"  {d['code']}  {d['name']:<40} leaves: {cov or '-'}")
    print(f"RET10 official codes: {len(ret10_codes)}")
    print(f"total leaf categories: {n_leaves}")
    print(f"attribute enums: {len(attributes)}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
