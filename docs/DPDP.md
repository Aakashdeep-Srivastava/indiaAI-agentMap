# DPDP Act 2023 — Compliance Posture (Stage-1 PoC)

How AgentMap AI handles the personal data of MSE owners under the Digital
Personal Data Protection Act, 2023.

## Data residency
- Primary datastore: Supabase PostgreSQL, **Mumbai (ap-south-1)** — all personal
  data at rest stays in India.
- Cache: Upstash Redis (TLS). No personal data is cached — only rate/quota state.
- AI processing: Sarvam AI (Indian provider) for STT/TTS/NER/classification.

## Consent
- Registration requires an explicit, informed consent checkbox (EN + HI) before
  any enterprise data is stored. The API rejects registrations without consent
  (`422`, enforced server-side in `POST /mse/`).
- Consent is recorded on the profile (`consent_given`, `consent_at`) and the
  registration is written to the immutable audit trail.

## Purpose limitation
Data is processed only to (a) classify the business into ONDC domains and
(b) recommend Seller Network Participants. No marketing use, no resale.

## Right to erasure
- `DELETE /mse/{id}` (NSIC administrator) removes the profile **and all derived
  AI artifacts** (classification results, match results). The erasure itself is
  recorded in the audit trail without retaining the erased personal data.

## Retention
| Data | Retention |
|---|---|
| Voice recordings / uploaded documents | **Not persisted** — processed in-memory for STT/OCR, then discarded |
| MSE profile (incl. mobile number) | Until erasure request or account closure |
| Derived AI results | Same lifecycle as the profile (deleted on erasure) |
| Audit logs | 180 days (operational accountability), no raw personal payloads |
| Auth data | bcrypt password hashes only; plaintext never stored |

## Access control
- All API endpoints require a signed JWT except health, login, and the public
  taxonomy. Bulk PII listing (`GET /mse/`) and the audit trail are
  administrator-only. Raw match factor scores are administrator-only.
- Database tables have RLS enabled (deny-all to Supabase's public REST roles);
  only the backend's owner connection can read/write.
- Login lockout: 5 failed attempts → 15-minute lock. Login attempts are rate
  limited per IP.

## Known Stage-1 gaps (tracked for Stage-2)
- Field-level encryption for mobile numbers (currently relies on disk-level
  encryption at rest provided by Supabase).
- Automated audit-log purge job (180-day policy currently manual).
- Data-principal self-service erasure (currently via NSIC administrator).
