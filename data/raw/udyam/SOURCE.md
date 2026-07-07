# District-wise Udyam MSME Registration Data (data.gov.in)

## Files
- `district_wise_msme.csv` — 788 data rows + header. Total MSME registered enterprises
  under UDYAM Registration till last date, district-wise.
- `district_wise_services_msme.csv` — 788 data rows + header. Services-sector MSME
  registered enterprises under UDYAM Registration till last date, district-wise.

## Columns (both files)
`state_name, state_id, district_name, lg_dt_code, medium, micro, small, total`
(medium/micro/small/total = enterprise counts by MSME classification; lg_dt_code = LG Directory district code)

## Source
- Publisher: Ministry of Micro, Small and Medium Enterprises, Government of India
- Platform: Open Government Data (OGD) Platform India — data.gov.in
- Catalog: https://www.data.gov.in/catalog/udyam-registration-msme-registration
  (catalog UUID: 0536e86e-3751-4054-84e5-e257d4c94477)

### Total MSME (district-wise)
- Catalog page: https://www.data.gov.in/resource/district-wise-total-msme-registered-enterprises-under-udyam-registration-till-last-date
- Resource ID: `f8cd85a1-f9b8-4ff1-b195-9f75c10eb338`
- API: `https://api.data.gov.in/resource/f8cd85a1-f9b8-4ff1-b195-9f75c10eb338?api-key=<key>&format=csv&offset=0&limit=1000`
- Dataset last updated (per API metadata): 2026-07-07T00:01:00Z

### Services-sector MSME (district-wise)
- Catalog page: https://www.data.gov.in/resource/district-wise-services-msme-registered-enterprises-under-udyam-registration-till-last-date
- Resource ID: `c3dfe7e6-0cfd-4ddb-8f79-9cb3695d9866`
- API: `https://api.data.gov.in/resource/c3dfe7e6-0cfd-4ddb-8f79-9cb3695d9866?api-key=<key>&format=csv&offset=0&limit=1000`
- Dataset last updated (per API metadata): 2026-07-06T21:14:08Z

## Retrieval
- Retrieved: 2026-07-07 via curl against api.data.gov.in
- API key used: the public sample key embedded in the data.gov.in resource pages
  (the well-known `579b464db66ec23bdd000001...` sample-key family; rate-limited,
  intended for testing/public access). For production use, register for a personal
  key at https://data.gov.in.
- Each resource has 788 total records; a single request with `limit=1000` returned
  the complete dataset (no pagination needed). Verified against API `total` field.

## License
- data.gov.in datasets are published under the Government Open Data License – India
  (GODL): https://data.gov.in/government-open-data-license-india
  Free to use with attribution to the data provider (Ministry of MSME) and data.gov.in.
