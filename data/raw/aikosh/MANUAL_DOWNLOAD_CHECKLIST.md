# AIKosh Manual Download Checklist (MSME–TEAMS Challenge)

Last updated: 2026-07-07

## What is ALREADY downloaded (no login was needed)

These are in `data/raw/aikosh/` — you do NOT need to re-download them:

| File | What it is | Status |
|------|-----------|--------|
| `district_wise_total_msme_registered_enterprises_under_udyam_registration.csv` | 788 districts, Micro/Small/Medium/Total Udyam counts, LGD codes | DONE (full dataset) |
| `list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra_sample100k.csv` | 100K of 1.83M unit-level Maharashtra records (name, address, district, PIN, NIC 5-digit code, activity, employment, investment) | DONE (sample — see Step 4 to get more) |
| `innovation_challenge_2026_guidelines.pdf` | Official 17-page challenge guidelines | DONE |
| `challenge_guidelines_text.txt` | Text extraction of the guidelines | DONE |

Both MSME datasets on AIKosh are mirrors of data.gov.in resources, which are public
(Government Open Data License – India). The AIKosh National SSO login is only needed for
AIKosh-hosted files, "join competition", and submission actions.

## Step 1 — Register on AIKosh (needed for competition participation, not for the data above)

1. Go to https://aikosh.indiaai.gov.in and click **Sign In / Register** (top right).
2. Choose **National Single Sign-On (Jan Parichay)**. Register as an **Individual / Explorer**
   using your email (kodokitech@gmail.com) or mobile + OTP. Complete profile as "Explorer".
3. After SSO login you are redirected back to AIKosh with a session. You need this to:
   - Click **Join Competition** on the MSME–TEAMS page (mandatory before submission).
   - Download any AIKosh-hosted dataset that shows a **Download** button requiring login.

## Step 2 — Check the MSME-TEAMS competition page for a sample-data drop

1. Visit: https://aikosh.indiaai.gov.in/home/competitions/details/149036ea-6d4d-496e-a844-faa3dc39e23c
2. Scroll to any **"Artifacts" / "Resources" / "Dataset"** section below the description.
   - As of 2026-07-07 the page's embedded state shows `artifacts: []` — **the Ministry has NOT attached sample data yet.**
   - Re-check weekly, especially near the registration deadline. If files appear, download each
     and save to `data/raw/aikosh/competition_artifacts/<original-filename>`.
3. Also re-download the guidelines PDF if it is revised (same URL, no login):
   https://aikosh.indiaai.gov.in/manual/010126_Innovation_Challenge_2026.pdf

## Step 3 — Dataset pages on AIKosh (verify "Download" behaviour after login)

Visit each page, click the blue **Download** button (top right of the dataset header).
Because these are External datasets, the button redirects to data.gov.in — from there click
**"Get Data" / Download** on the resource page.

1. **District-wise Udyam counts** (already fully downloaded — only re-download if you want fresher daily figures):
   - AIKosh: https://aikosh.indiaai.gov.in/home/datasets/details/district_wise_total_msme_registered_enterprises_under_udyam_registration_till_last_date.html
   - data.gov.in: https://www.data.gov.in/resource/district-wise-total-msme-registered-enterprises-under-udyam-registration-till-last-date
   - Save as: `data/raw/aikosh/district_wise_total_msme_registered_enterprises_under_udyam_registration.csv`

2. **Udyog Aadhaar unit-level list — Maharashtra:**
   - AIKosh: https://aikosh.indiaai.gov.in/home/datasets/details/list_of_msme_registered_units_under_udyog_aadhaar_memorandum_maharashtra.html
   - data.gov.in catalog (all states): https://www.data.gov.in/catalog/list-msme-registered-units-under-udyog-aadhaar-memorandum-till-last-date
   - Save as: `data/raw/aikosh/list_of_msme_registered_units_under_udyog_aadhaar_memorandum_<state>.csv`

3. **Other state pages** (same slug pattern — swap the state name):
   `https://aikosh.indiaai.gov.in/home/datasets/details/list_of_msme_registered_units_under_udyog_aadhaar_memorandum_<state>.html`
   e.g. `..._karnataka.html`, `..._tamil_nadu.html`, `..._uttar_pradesh.html`, `..._gujarat.html`
   (If a slug 404s, search "udyog aadhaar" in the AIKosh Datasets search box.)

## Step 4 — Get MORE unit-level rows without any login (recommended over Step 3)

The data.gov.in API serves the full 9.96M-record catalog. Register free at
https://data.gov.in (My Account → Generate API Key), then:

```
https://api.data.gov.in/catalog/2c895ab9-8042-4653-bfeb-7dc71281fd57?api-key=YOUR_KEY&format=csv&offset=0&limit=20000&filters[State]=MAHARASHTRA
```

- Increase `offset` by 20000 per request (Maharashtra total: 1,826,246 rows).
- Other states: `filters[State]=KARNATAKA`, `filters[State]=TAMIL NADU` (URL-encode the space), etc. Values are UPPERCASE.
- District filter also works: `filters[District]=PUNE`.
- Full-India pull is ~9.96M rows / ~3GB — pull per-state samples instead.

## Step 5 — Other AIKosh datasets worth grabbing for the project (search on AIKosh, login if prompted)

In the AIKosh Datasets search (https://aikosh.indiaai.gov.in/home/datasets.html), search:
- "MSME" — state/district Udyam summaries, exporter lists
- "ONDC" — any network/taxonomy datasets
- "NIC code" — industrial classification mappings (useful for VargBot label space)
Save anything downloaded to `data/raw/aikosh/<slug>.<ext>` and record URL + date + license in `SOURCE.md`.

## Honest status summary

- **Auto-downloaded without login:** district-wise Udyam CSV (complete), 100K-row Maharashtra unit-level sample, guidelines PDF.
- **Not available to anyone yet:** competition sample data (Ministry has attached nothing — `artifacts: []`).
- **Needs your SSO login:** joining the competition, submissions, and any AIKosh-hosted (non-external) dataset files.
- **Needs a free data.gov.in key (not SSO):** bulk-pulling more of the 1.83M Maharashtra rows or other states.
