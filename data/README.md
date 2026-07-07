# AgentMap AI — Data Directory

## Provenance summary (all retrieved 2026-07-07)

### `raw/` — source data (large files; regenerable via SOURCE.md recipes)
| Path | What | Source | License |
|---|---|---|---|
| `raw/ondc/livenetwork_v91.json` | 576 ONDC network participants (281 seller-side) | ondc.org public registry | public |
| `raw/ondc/protocol-network-extension/` | ONDC retail attribute enums (88 files) | github.com/ONDC-Official | repo license |
| `raw/ondc/ret-enums/` | Official domain + category enums (context/category.yaml, category constants) | ONDC-RET-Specifications release-2.0.2, log-validation-utility | repo license |
| `raw/flipkart/flipkart_20k.csv` | 20,000 products with category trees | PromptCloudHQ via HuggingFace mirror | CC BY-SA 4.0 |
| `raw/udyam/*.csv` | District-wise Udyam MSME counts (788 districts × 2 variants) | data.gov.in (Ministry of MSME) | GODL-India |
| `raw/aikosh/*maharashtra_sample100k.csv` | 100K real Udyog Aadhaar unit records | data.gov.in via AIKosh listing | GODL-India |

### `processed/` — built artifacts (run `scripts/build_*.py` from repo root)
| File | What | Built by |
|---|---|---|
| `ondc_taxonomy.json` | 14 official RET domains, 392 leaf categories, 96 RET10 codes, 84 attribute enums | `scripts/build_ondc_taxonomy.py` |
| `snp_profiles.json/.csv` | 281 real seller NPs (179 TEAM-scope); synthetic operational fields flagged in meta | `scripts/build_snp_profiles.py` |
| `product_category_pairs.csv` | 19,653 product→RET-domain training pairs (8 domains) | `scripts/build_product_category_pairs.py` |
| `mse_profiles_5k.csv` + `.meta.json` | 5K MSE profiles on the TEAM 27-field schema; real unit attributes + NIC-derived labels (13 domains) | `scripts/build_mse_profiles.py` |

## Honesty rules (jury-facing)
- Every synthetic field is enumerated in the artifact's meta (`synthetic_fields`), generated with fixed seed `20260707`.
- `ondc_domain` labels in `mse_profiles_5k.csv` derive from REAL NIC-2008 codes — not invented.
- SNP capacity/commission/rating are placeholders for non-public TEAM-portal data (Stage-2 integration).
- No AIKosh PS2 sample data existed as of 2026-07-07 (competition page `artifacts: []`) — re-check weekly.
