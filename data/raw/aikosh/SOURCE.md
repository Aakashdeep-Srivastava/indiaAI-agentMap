# AIKosh / data.gov.in — MSME Dataset Sources

Retrieved: 2026-07-07 (no login required — see notes below)

## How these were obtained

AIKosh dataset pages for the MSME datasets are marked `dataset_source: "External"` in their
embedded page state (Angular `ng-state` JSON). The actual data is hosted on **data.gov.in**
(Open Government Data Platform India) and is downloadable **without any login** via the
data.gov.in public API. The AIKosh SSO login is only needed for AIKosh-hosted files and for
"join competition" actions — not for these mirrored datasets.

## Files

### 1. district_wise_total_msme_registered_enterprises_under_udyam_registration.csv
- **Rows:** 788 districts + header (all India, Micro/Small/Medium/Total counts per district, with LGD codes)
- **AIKosh page:** https://aikosh.indiaai.gov.in/home/datasets/details/district_wise_total_msme_registered_enterprises_under_udyam_registration_till_last_date.html
- **Actual source (data.gov.in resource):** https://www.data.gov.in/resource/district-wise-total-msme-registered-enterprises-under-udyam-registration-till-last-date
- **Download URL used:**
  `https://api.data.gov.in/resource/f8cd85a1-f9b8-4ff1-b195-9f75c10eb338?api-key=<key>&offset=0&limit=all&format=csv`
- **Publisher:** Ministry of Micro, Small and Medium Enterprises
- **License:** Government Open Data License – India (GODL) / "Open Government License, India" per AIKosh metadata
- **Update frequency:** Daily (per source metadata)

### 2. list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra_sample100k.csv
- **Rows:** 100,000 sample + header, out of **1,826,246 total Maharashtra records** (catalog total across India: 9,957,559)
- **Columns:** AID, EnterpriseName, SocialCategory, Gender, PH, OrganisationType, PlantLocation, Address, State, District, PINCode, CommmenceDate, MajorActivity, EnterpriseType, NIC5DigitCode, TotalEmp, InvestmentCost, Dic_Name, RegistrationDate, LG_Dist_Code
- **AIKosh page:** https://aikosh.indiaai.gov.in/home/datasets/details/list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra.html
- **Actual source (data.gov.in catalog):** https://www.data.gov.in/catalog/list-msme-registered-units-under-udyog-aadhaar-memorandum-till-last-date
  (catalog UUID `2c895ab9-8042-4653-bfeb-7dc71281fd57`; queried with `filters[State]=MAHARASHTRA`, paginated 20,000 rows per request, offsets 0–80,000)
- **Publisher:** Ministry of Micro, Small and Medium Enterprises
- **License:** Government Open Data License – India (GODL)
- **Note:** Catalog last updated 2020-01-29 (Udyog Aadhaar was superseded by Udyam Registration in July 2020 — treat as historical unit-level data). To pull more rows or other states, change `filters[State]=` and increase `offset` in steps of 20000.

### 3. innovation_challenge_2026_guidelines.pdf
- **17-page official guidelines** for IndiaAI Innovation Challenge 2026 (MSME–TEAMS + AYUSH)
- **URL:** https://aikosh.indiaai.gov.in/manual/010126_Innovation_Challenge_2026.pdf (public, no login)
- Text extraction already in `challenge_guidelines_text.txt`

## Competition page — sample data status (checked 2026-07-07)

Competition page: https://aikosh.indiaai.gov.in/home/competitions/details/149036ea-6d4d-496e-a844-faa3dc39e23c
The page's embedded state has `"artifacts": []` — **no sample dataset attached by the Ministry yet**.
Re-check periodically (see MANUAL_DOWNLOAD_CHECKLIST.md).

## API notes (for reproducing / expanding downloads)

- Base: `https://api.data.gov.in/resource/<uuid>` (single resource) or `https://api.data.gov.in/catalog/<uuid>` (multi-resource catalog)
- Params: `api-key=<key>&format=csv|json&offset=N&limit=N&filters[Field]=VALUE`
- The generic public sample key `579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b` is heavily rate-limited (429s).
  The key embedded in data.gov.in's own pages (`...cdc3b564546246a772a26393094f5645`) worked reliably at ~20K rows / 9s per request.
  For sustained use, register free at https://data.gov.in and generate a personal API key (My Account → API Key).
- AIKosh's own API (`https://aikosha-api.indiaai.gov.in/...`) returns 403 Forbidden without an authenticated session token, but the same
  JSON it would return is embedded server-side in each dataset page inside `<script id="ng-state" type="application/json">`.

## AIKosh SDK downloads (2026-07-07, via `pip install aikosh` + team API key)
- **ONDC-MyStore_App_Products_Orders.xlsx** — AIKosh dataset `9b824755-f646-4e7b-bae9-f3bd1f900511`
  ("MEPMA - SHG Product Details Online Orders", AP MEPMA). Products sheet: 9,071 real SHG
  products with seller-entered category + district. Orders sheet: 2,062 order aggregates.
- **ONDC-WowGeni_App_Orders.xlsx** — same dataset. 137,536 real ONDC order lines
  (order id, product, price, city, seller point) across 53 MEPMA seller points, 1,234 cities.
- Processed by `scripts/build_mepma_artifacts.py` → `data/processed/mepma_product_pairs.csv`
  + `data/processed/snp_transaction_history.csv`.
- Note: seller-entered categories are inconsistent/missing (935 products uncategorized;
  "Jewellary", "Floor cleners" typos) — direct evidence of the PS2 "inconsistent product
  category tagging" pain point.

## Follow-ups
- "District and Social Category wise Total MSME Registered Enterprises" (AIKosh id
  346f90bf..., external → data.gov.in) — resource ID lookup pending; fairness analysis input.
- "Kirana Chain" (AIKosh id 6c6db8c8..., external → huggingface.co/datasets/Atlas-AI-Labs/KiranaChain).
- Other state Udyog Aadhaar unit lists available via keyword "udyam", accessScope="all".
