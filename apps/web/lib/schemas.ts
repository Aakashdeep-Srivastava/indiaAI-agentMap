/* Runtime validation at the API boundary — the contract, in one place.
 *
 * The backend validates its *inputs* with Pydantic; nothing validated the
 * frontend's. A TypeScript interface is erased at build time, so a backend
 * field that gets renamed or nulled does not fail loudly: it compiles fine and
 * renders as `undefined` somewhere in the UI, and a user finds the bug.
 *
 * These schemas make the contract a runtime artifact. Each one mirrors a
 * Pydantic response model in apps/api, so the two ends of every call are now
 * described in the same terms and drift shows up as a validation error instead
 * of a blank panel.
 *
 * FAILURE POLICY — deliberate, and it differs by surface:
 *   - Chrome and lists (the bell, a queue, a table) degrade to empty via
 *     `safeParseOr`. A malformed response must never take down the page.
 *   - Anything the user explicitly acted on (submitting a classification,
 *     running a match) uses `parseOrThrow`, so the error surfaces in the UI
 *     the user is looking at rather than being swallowed.
 *
 * NULLISH, NOT NULLABLE: FastAPI omits `None` fields under
 * `response_model_exclude_none`, so an absent key and an explicit null are
 * both legal on the wire. `.nullish()` accepts either; `.nullable()` alone
 * would reject the omitted case and fail valid responses.
 */

import { z } from "zod";

/* ── Primitives ────────────────────────────────────────────────────── */

export const ConfidenceBand = z.enum(["green", "yellow", "red"]);

/* ── Auth ──────────────────────────────────────────────────────────── */

export const MeSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  role: z.enum(["mse", "admin"]),
  name: z.string(),
  mse_id: z.number().int().nullish(),
});

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default("bearer"),
  role: z.string(),
  name: z.string(),
});

/* ── MSE ───────────────────────────────────────────────────────────── */

/** The full TEAM-form record. Only `id` and `name` are guaranteed; the rest
 *  are optional because /mse/ and /mse/{id} serve different projections and
 *  the informal long-tail legitimately has no Udyam, GST or PAN. */
export const MSESchema = z.object({
  id: z.number().int(),
  name: z.string(),
  udyam_number: z.string().nullish(),
  description: z.string().nullish(),
  district: z.string().nullish(),
  state: z.string().nullish(),
  pin_code: z.string().nullish(),
  nic_code: z.string().nullish(),
  language: z.string().nullish(),
  status: z.string().nullish(),
  entrepreneur_name: z.string().nullish(),
  email: z.string().nullish(),
  mobile_number: z.string().nullish(),
  address: z.string().nullish(),
  org_type: z.string().nullish(),
  major_activity: z.string().nullish(),
  transaction_type: z.string().nullish(),
  pan_number: z.string().nullish(),
  gst_number: z.string().nullish(),
  turnover_band: z.string().nullish(),
  turnover_prev_fy: z.string().nullish(),
  products: z.string().nullish(),
  consent_at: z.string().nullish(),
  reviewed_by: z.string().nullish(),
  reviewed_at: z.string().nullish(),
  review_note: z.string().nullish(),
  assigned_snp_id: z.number().int().nullish(),
  assigned_snp_name: z.string().nullish(),
  assigned_by: z.string().nullish(),
  assigned_at: z.string().nullish(),
  created_at: z.string().nullish(),
  login_id: z.string().nullish(),
});

export const MSEListSchema = z.array(MSESchema);

export const MSESearchItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  udyam_number: z.string().nullish(),
  district: z.string().nullish(),
  state: z.string().nullish(),
});
export const MSESearchListSchema = z.array(MSESearchItemSchema);

/* ── Taxonomy ──────────────────────────────────────────────────────── */

export const DomainSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  categories: z
    .array(z.object({ id: z.number().int(), code: z.string(), name: z.string() }))
    .default([]),
});
export const DomainListSchema = z.array(DomainSchema);

/* ── VargBot classification ────────────────────────────────────────── */

export const PredictionItemSchema = z.object({
  domain: z.string(),
  confidence: z.number(),
  category: z.string().nullish(),
  category_name: z.string().nullish(),
  explanation: z.string().nullish(),
});

export const ComplianceItemSchema = z.object({
  name: z.string(),
  note: z.string(),
  // `catch` keeps an unrecognised status renderable rather than failing the
  // whole classification result the user just waited on.
  status: z.enum(["done", "action"]).catch("action"),
});

export const ClassifyResultSchema = z.object({
  mse_id: z.number().int(),
  top3: z.array(PredictionItemSchema),
  selected_domain: z.string(),
  confidence: z.number(),
  selected_category: z.string().nullish(),
  selected_category_name: z.string().nullish(),
  explanation: z.string().nullish(),
  engine: z.string().nullish(),
  attributes: z.record(z.string(), z.string()).default({}),
  compliance: z.array(ComplianceItemSchema).default([]),
  demand: z
    .object({
      level: z.string(),
      orders_observed: z.number(),
      note: z.string(),
    })
    .nullish(),
});

export const HistoryItemSchema = z.object({
  id: z.number().int(),
  predicted_domain: z.string(),
  confidence: z.number(),
  top3_predictions: z.array(PredictionItemSchema).nullish(),
  model_version: z.string().nullish(),
  created_at: z.string(),
});
export const HistoryListSchema = z.array(HistoryItemSchema);

/* ── JodakAI matching ──────────────────────────────────────────────── */

/** Raw sub-scores. The API returns these ONLY to admins; MSE users get
 *  qualitative bands instead. Optional here because their absence is the
 *  normal, correct case for an enterprise user. */
export const FactorBreakdownSchema = z.object({
  domain_score: z.number(),
  geo_score: z.number(),
  commission_score: z.number(),
  history_score: z.number(),
  sentiment_score: z.number(),
});

export const MatchItemSchema = z.object({
  snp_id: z.number().int(),
  snp_name: z.string(),
  composite_score: z.number(),
  confidence_band: ConfidenceBand,
  factors: FactorBreakdownSchema.nullish(),
  // Qualitative bands, shown to MSE users in place of the raw sub-scores.
  // Nullish because admins receive `factors` instead — absence here is the
  // normal case for an officer session, not an error.
  factor_bands: z
    .record(z.string(), z.enum(["high", "medium", "low"]).catch("low"))
    .nullish(),
  fit_reasons: z.array(z.string()).nullish(),
  explainer_en: z.string(),
  explainer_hi: z.string(),
});

export const MatchResponseSchema = z.object({
  mse_id: z.number().int(),
  mse_name: z.string(),
  predicted_domain: z.string().nullish(),
  matches: z.array(MatchItemSchema),
  nudges: z.array(z.string()).default([]),
});

const GeoPointSchema = z.object({
  state: z.string(),
  count: z.number(),
  lat: z.number(),
  lng: z.number(),
});

export const ClusterDataSchema = z.object({
  industry_label: z.string(),
  total_similar: z.number(),
  your_state: z.string().nullish(),
  your_district: z.string().nullish(),
  your_location: z.tuple([z.number(), z.number()]).nullish(),
  by_state: z.array(GeoPointSchema).default([]),
  by_district: z
    .array(GeoPointSchema.extend({ district: z.string() }))
    .default([]),
  top_districts: z
    .array(z.object({ district: z.string(), state: z.string(), count: z.number() }))
    .default([]),
  insights: z.array(z.string()).default([]),
});

/* ── Catalogue Studio ──────────────────────────────────────────────── */

export const CatalogueItemSchema = z.object({
  row: z.number(),
  product_name: z.string(),
  price_inr: z.number().nullish(),
  category_domain: z.string().nullish(),
  issues: z.array(z.string()).default([]),
});

export const UploadResultSchema = z.object({
  total_rows: z.number(),
  valid_rows: z.number(),
  items: z.array(CatalogueItemSchema).default([]),
  errors: z.array(z.string()).default([]),
  beckn_catalog: z.record(z.string(), z.unknown()).default({}),
  profile_enriched: z.boolean().default(false),
});

/* ── Audit ─────────────────────────────────────────────────────────── */

export const AuditEntrySchema = z.object({
  id: z.number().int(),
  action: z.string(),
  entity_type: z.string().nullish(),
  entity_id: z.number().int().nullish(),
  details: z.string().nullish(),
  performed_by: z.string().nullish(),
  created_at: z.string(),
});
export const AuditListSchema = z.array(AuditEntrySchema);

/* ── Claims Copilot ────────────────────────────────────────────────── */

export const RuleCheckSchema = z.object({
  rule: z.string(),
  label: z.string(),
  passed: z.boolean(),
  note: z.string(),
});

export const ClaimSchema = z.object({
  claim_id: z.string(),
  claim_type: z.string(),
  mse_id: z.number().int(),
  mse_name: z.string(),
  udyam_number: z.string().nullish(),
  state: z.string().nullish(),
  snp_name: z.string(),
  channel: z.string(),
  sku_count: z.number(),
  claimed_amount: z.number(),
  computed_amount: z.number(),
  checks: z.array(RuleCheckSchema).default([]),
  passed_all: z.boolean(),
  risk_score: z.number(),
  risk_band: ConfidenceBand,
  anomalies: z.array(z.string()).default([]),
  decision: z.string().nullish(),
  decided_by: z.string().nullish(),
});

export const ClaimsQueueSchema = z.object({
  claims: z.array(ClaimSchema).default([]),
  stats: z.object({
    total: z.number(),
    pending: z.number(),
    auto_clearable: z.number(),
    flagged_red: z.number(),
    amount_pending: z.number(),
    amount_at_risk: z.number(),
  }),
  source: z.string().nullish(),
});

/* ── Model health ──────────────────────────────────────────────────── */

export const HealthReportSchema = z.object({
  registry: z.object({
    model_name: z.string(),
    serving: z.object({
      engine: z.string().nullish(),
      loaded: z.boolean(),
      gate: z.number(),
      domains: z.number(),
    }),
    versions: z.array(
      z.object({
        version: z.string(),
        stage: z.enum(["production", "archived"]).catch("archived"),
        trained: z.string().nullish(),
        algorithm: z.string().nullish(),
        corpus: z.string().nullish(),
        domains: z.number(),
        cv_macro_f1: z.number().nullish(),
        cv_std: z.number().nullish(),
        test_accuracy: z.number().nullish(),
        test_macro_f1: z.number().nullish(),
        real_accuracy: z.number().nullish(),
        n_test: z.number().nullish(),
      }),
    ),
  }),
  generated_at: z.string(),
  status: z.enum(["green", "amber", "red"]),
  alerts: z
    .array(
      z.object({
        severity: z.enum(["red", "amber"]),
        code: z.string(),
        message: z.string(),
      }),
    )
    .default([]),
  thresholds: z.object({
    fallback_alert: z.number(),
    override_alert: z.number(),
    low_confidence: z.number(),
  }),
  summary: z.object({
    total_classifications: z.number(),
    avg_confidence: z.number().nullish(),
    p25_confidence: z.number().nullish(),
    low_conf_share: z.number(),
    window_weeks: z.number(),
  }),
  engine_mix: z.object({
    families: z.array(
      z.object({
        family: z.enum(["trained", "llm", "fallback", "other"]).catch("other"),
        label: z.string(),
        count: z.number(),
        share: z.number(),
      }),
    ),
    engines: z.array(z.object({ engine: z.string(), count: z.number() })),
    trained_share: z.number(),
    llm_share: z.number(),
    fallback_share: z.number(),
  }),
  confidence_trend: z.array(
    z.object({
      week_start: z.string(),
      count: z.number(),
      avg_confidence: z.number(),
      p25_confidence: z.number(),
      fallback_share: z.number(),
    }),
  ),
  oversight: z.object({
    reviews_decided: z.number(),
    approved: z.number(),
    rejected: z.number(),
    rejection_rate: z.number(),
    allocations: z.number(),
    allocation_overrides: z.number(),
    allocation_override_rate: z.number(),
  }),
  domains: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      count: z.number(),
      avg_confidence: z.number(),
      low_conf_share: z.number(),
      baseline_f1: z.number().nullish(),
      baseline_support: z.number().nullish(),
      status: z.enum(["ok", "watch", "no_baseline"]).catch("no_baseline"),
    }),
  ),
  // Always present in the response (routes/model_health.py builds it
  // unconditionally), so it is required here — the inner values are what can
  // be null, when no frozen baseline has been shipped yet.
  baseline: z.object({
    trained: z.string().nullish(),
    model: z.string().nullish(),
    test_accuracy: z.number().nullish(),
    test_macro_f1: z.number().nullish(),
    covered_domains: z.array(z.string()).default([]),
  }),
});

/* ── App reviews ───────────────────────────────────────────────────── */

export const ReviewSchema = z.object({
  id: z.number().int(),
  rating: z.number(),
  comment: z.string().nullish(),
  name: z.string().nullish(),
  persona: z.string().nullish(),
  created_at: z.string(),
});

export const ReviewSummarySchema = z.object({
  count: z.number(),
  average: z.number(),
  distribution: z.record(z.string(), z.number()).default({}),
  reviews: z.array(ReviewSchema).default([]),
});

/* ── Speech / documents ────────────────────────────────────────────── */

export const TranscriptionSchema = z.object({
  text: z.string().default(""),
  detected_language: z.string().nullish(),
  is_mock: z.boolean().nullish(),
  engine: z.string().nullish(),
});

/** Mirrors routes/ner.py NERResponse. `engine` is the honesty stamp — the
 *  engine that actually ran (`sarvam-30b` or the `regex` fallback), never the
 *  one we hoped would. */
export const NerResultSchema = z.object({
  extracted: z.record(z.string(), z.string()).default({}),
  engine: z.string().default("unknown"),
  field_count: z.number().nullish(),
});

export const TtsResultSchema = z.object({
  audio_base64: z.string().nullish(),
  content_type: z.string().nullish(),
  engine: z.string().nullish(),
  is_mock: z.boolean().nullish(),
});

/** Mirrors services/ocr.py — note `relevance`, which drives the document
 *  triage branch in the Sathi panel (a catalogue belongs to a later step; a
 *  random spreadsheet is not relevant at all). */
export const OcrResultSchema = z.object({
  extracted_fields: z.record(z.string(), z.string()).default({}),
  document_type: z.string().nullish(),
  relevance: z.string().nullish(),
  message_en: z.string().nullish(),
  message_hi: z.string().nullish(),
  confidence: z.number().nullish(),
  engine: z.string().nullish(),
  is_mock: z.boolean().nullish(),
});

/* ── Notifications ─────────────────────────────────────────────────── */

/** `catch` keeps an unknown future event renderable rather than failing the
 *  whole feed — a new event type shipped by the backend must not blank the
 *  bell for users still on an older bundle. */
export const NotificationEvent = z
  .enum([
    "registration_approved",
    "registration_rejected",
    "snp_allocated",
    "classification_complete",
    "action_needed",
    "announcement",
  ])
  .catch("announcement");

export const NotificationItemSchema = z.object({
  id: z.number().int(),
  event: NotificationEvent,
  title_en: z.string(),
  title_hi: z.string().nullish(),
  body_en: z.string().nullish(),
  body_hi: z.string().nullish(),
  // In-app paths only. A notification is rendered as a click target, so an
  // absolute URL arriving here would be an open redirect on the user's behalf.
  // `startsWith("/")` alone is not enough — "//host" also starts with a slash
  // and browsers treat it as protocol-relative, navigating off-site.
  href: z
    .string()
    .nullish()
    .refine((v) => !v || (v.startsWith("/") && !v.startsWith("//")), {
      message: "href must be an in-app path",
    }),
  is_read: z.boolean(),
  created_at: z.string().nullish(),
});

export const NotificationFeedSchema = z.object({
  items: z.array(NotificationItemSchema),
  unread: z.number().int().nonnegative(),
});

/* ── Inferred types ────────────────────────────────────────────────── */

export type Me = z.infer<typeof MeSchema>;
export type MSE = z.infer<typeof MSESchema>;
export type MSESearchItem = z.infer<typeof MSESearchItemSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type PredictionItem = z.infer<typeof PredictionItemSchema>;
export type ComplianceItem = z.infer<typeof ComplianceItemSchema>;
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export type MatchItem = z.infer<typeof MatchItemSchema>;
export type MatchResponse = z.infer<typeof MatchResponseSchema>;
export type ClusterData = z.infer<typeof ClusterDataSchema>;
export type CatalogueItem = z.infer<typeof CatalogueItemSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type RuleCheck = z.infer<typeof RuleCheckSchema>;
export type ClaimsQueue = z.infer<typeof ClaimsQueueSchema>;
export type HealthReport = z.infer<typeof HealthReportSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;
export type Transcription = z.infer<typeof TranscriptionSchema>;
export type NerResult = z.infer<typeof NerResultSchema>;
export type TtsResult = z.infer<typeof TtsResultSchema>;
export type OcrResult = z.infer<typeof OcrResultSchema>;
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
export type NotificationFeed = z.infer<typeof NotificationFeedSchema>;

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Parse, or fall back — for surfaces where a malformed response must not
 *  break the page. Logs in development so a contract drift is still visible
 *  to whoever is working on it, and stays silent in production. */
export function safeParseOr<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fallback: T,
  label = "response",
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[schema] ${label} failed validation`, result.error.issues);
  }
  return fallback;
}

/** Parse, or throw — for actions the user explicitly took. Silently swallowing
 *  a bad response here would leave them staring at a spinner with no idea the
 *  request came back wrong. */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label = "response"): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[schema] ${label} failed validation`, result.error.issues);
  }
  throw new Error(`The server returned an unexpected ${label}. Please try again.`);
}
