"use client";

/* Typed data access for the whole portal.
 *
 * Every call goes through one path here: fetch via `apiFetch` (base URL,
 * bearer token, timeout, 401 handling), then parse with the matching Zod
 * schema, then hand TanStack Query a value whose shape is already guaranteed.
 * Components receive data, loading and error — they no longer own a
 * `useState`/`useEffect`/`fetch` triple each.
 *
 * Why this is worth the indirection:
 *   - Requests dedupe. Several components ask "which enterprise am I?"; that
 *     is now one request, shared, instead of one per caller.
 *   - Mutations invalidate exactly what they affect, so a review decision
 *     refreshes the queue without a manual refetch or a full page reload.
 *   - Validation is unavoidable rather than remembered. Adding an endpoint
 *     here forces you to say what it returns.
 *
 * Read paths use `safeParseOr` and degrade to an empty value, because a
 * malformed list should render as "nothing here" rather than a crash. Write
 * paths and the AI actions use `parseOrThrow`, because a user who just
 * clicked Classify needs to see an error, not an eternal spinner.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiFetch, getSession } from "@/lib/auth";
import { queryKeys } from "@/lib/query-provider";
import {
  AuditListSchema,
  ClaimsQueueSchema,
  ClassifyResultSchema,
  ClusterDataSchema,
  DomainListSchema,
  HealthReportSchema,
  HistoryListSchema,
  MSEListSchema,
  MSESchema,
  MSESearchListSchema,
  MatchResponseSchema,
  MeSchema,
  NotificationFeedSchema,
  ReviewSummarySchema,
  UploadResultSchema,
  parseOrThrow,
  safeParseOr,
  type AuditEntry,
  type ClaimsQueue,
  type ClassifyResult,
  type ClusterData,
  type Domain,
  type HealthReport,
  type HistoryItem,
  type MSE,
  type MSESearchItem,
  type MatchResponse,
  type Me,
  type NotificationFeed,
  type ReviewSummary,
  type UploadResult,
} from "@/lib/schemas";

/* ── Plumbing ──────────────────────────────────────────────────────── */

/** GET + parse, degrading to `fallback` on a malformed body. */
async function getParsed<T>(path: string, schema: Parameters<typeof safeParseOr<T>>[0], fallback: T): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) return fallback;
  return safeParseOr(schema, await res.json(), fallback, path);
}

/** POST + parse, throwing on a bad status or a malformed body. Used where the
 *  user is waiting on something they explicitly asked for. */
async function postParsed<T>(
  path: string,
  body: unknown,
  schema: Parameters<typeof parseOrThrow<T>>[0],
  timeoutMs?: number,
): Promise<T> {
  const res = await apiFetch(
    path,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    timeoutMs,
  );
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      typeof detail?.detail === "string" ? detail.detail : `Request failed (${res.status})`,
    );
  }
  return parseOrThrow(schema, await res.json(), path);
}

const signedIn = () => typeof window !== "undefined" && !!getSession();

/* ── Identity ──────────────────────────────────────────────────────── */

export function useMe(options?: Partial<UseQueryOptions<Me | null>>) {
  return useQuery<Me | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return null;
      return safeParseOr<Me | null>(MeSchema.nullable(), await res.json(), null, "/auth/me");
    },
    enabled: signedIn(),
    // Identity does not change within a session; anything shorter just
    // re-asks the same question.
    staleTime: 10 * 60_000,
    retry: false,
    ...options,
  });
}

/* ── Enterprises ───────────────────────────────────────────────────── */

export function useMSE(mseId: number | null | undefined) {
  return useQuery<MSE | null>({
    queryKey: queryKeys.mse(mseId ?? 0),
    queryFn: () => getParsed<MSE | null>(`/mse/${mseId}`, MSESchema.nullable(), null),
    enabled: signedIn() && !!mseId,
    staleTime: 60_000,
  });
}

/** Imperative, cache-aware fetch of one enterprise.
 *
 * For flows that need the record *before* deciding what to do next (look up
 * the business, then classify it) rather than rendering whatever a hook
 * currently holds. Goes through `fetchQuery`, so it is served from and
 * written to the same cache the hooks read — not a bypass.
 */
export function useFetchMSE() {
  const qc = useQueryClient();
  return (mseId: number) =>
    qc.fetchQuery({
      queryKey: queryKeys.mse(mseId),
      queryFn: () => getParsed<MSE | null>(`/mse/${mseId}`, MSESchema.nullable(), null),
      staleTime: 60_000,
    });
}

/** The signed-in owner's own enterprise, resolved through /auth/me. */
export function useMyMSE() {
  const { data: me } = useMe();
  const query = useMSE(me?.mse_id);
  return { ...query, mseId: me?.mse_id ?? null };
}

export function useMSEList(limit = 20) {
  return useQuery<MSE[]>({
    queryKey: [...queryKeys.mseList, limit],
    queryFn: () => getParsed<MSE[]>(`/mse/?limit=${limit}`, MSEListSchema, []),
    enabled: signedIn(),
  });
}

/** Type-ahead search. Disabled below 2 characters so a single keystroke does
 *  not fire a request against the live backend. */
export function useMSESearch(query: string) {
  const q = query.trim();
  return useQuery<MSESearchItem[]>({
    queryKey: queryKeys.mseSearch(q),
    queryFn: () =>
      getParsed<MSESearchItem[]>(
        `/mse/search?q=${encodeURIComponent(q)}`,
        MSESearchListSchema,
        [],
      ),
    enabled: signedIn() && q.length >= 2,
    staleTime: 30_000,
  });
}

export function useClusters(mseId: number | null | undefined) {
  return useQuery<ClusterData | null>({
    queryKey: queryKeys.clusters(mseId ?? 0),
    queryFn: () =>
      getParsed<ClusterData | null>(`/mse/${mseId}/clusters`, ClusterDataSchema.nullable(), null),
    enabled: signedIn() && !!mseId,
    staleTime: 5 * 60_000,
  });
}

/* ── Taxonomy ──────────────────────────────────────────────────────── */

export function useDomains() {
  return useQuery<Domain[]>({
    queryKey: queryKeys.domains,
    queryFn: () => getParsed<Domain[]>("/domains/", DomainListSchema, []),
    // The ONDC taxonomy changes on the order of releases, not minutes.
    staleTime: 30 * 60_000,
  });
}

/* ── VargBot ───────────────────────────────────────────────────────── */

export function useClassificationHistory(mseId: number | null | undefined) {
  return useQuery<HistoryItem[]>({
    queryKey: queryKeys.classifyHistory(mseId ?? 0),
    queryFn: () => getParsed<HistoryItem[]>(`/classify/history/${mseId}`, HistoryListSchema, []),
    enabled: signedIn() && !!mseId,
  });
}

/** Run the classifier. Invalidates the history it just added a row to, and
 *  the notification feed, since a completed classification emits one. */
export function useClassify() {
  const qc = useQueryClient();
  return useMutation<ClassifyResult, Error, { mseId: number }>({
    mutationFn: ({ mseId }) =>
      postParsed<ClassifyResult>("/classify/", { mse_id: mseId }, ClassifyResultSchema, 120_000),
    onSuccess: (_data, { mseId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.classifyHistory(mseId) });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useClassifyText() {
  return useMutation<ClassifyResult, Error, { description: string; language?: string }>({
    mutationFn: ({ description, language = "en" }) =>
      postParsed<ClassifyResult>(
        "/classify/text",
        { description, language },
        ClassifyResultSchema,
        120_000,
      ),
  });
}

/* ── JodakAI ───────────────────────────────────────────────────────── */

export function useMatch() {
  const qc = useQueryClient();
  return useMutation<MatchResponse, Error, { mseId: number; topK?: number }>({
    mutationFn: ({ mseId, topK = 5 }) =>
      postParsed<MatchResponse>(
        "/match/",
        { mse_id: mseId, top_k: topK },
        MatchResponseSchema,
        120_000,
      ),
    // Matching writes readiness nudges into the owner's feed.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

/* ── Officer actions ───────────────────────────────────────────────── */

export function useReviewMSE() {
  const qc = useQueryClient();
  return useMutation<MSE, Error, { mseId: number; action: "approve" | "reject"; note?: string }>({
    mutationFn: ({ mseId, action, note }) =>
      postParsed<MSE>(`/mse/${mseId}/review`, { action, note }, MSESchema),
    onSuccess: (_d, { mseId }) => {
      // The decision changes the queue, the enterprise itself, and the
      // oversight counters on the health dashboard.
      qc.invalidateQueries({ queryKey: queryKeys.mseList });
      qc.invalidateQueries({ queryKey: queryKeys.mse(mseId) });
      qc.invalidateQueries({ queryKey: queryKeys.modelHealth });
    },
  });
}

export function useAllocateSNP() {
  const qc = useQueryClient();
  return useMutation<
    MSE,
    Error,
    { mseId: number; snpId: number; note?: string; recommendedSnpId?: number }
  >({
    mutationFn: ({ mseId, snpId, note, recommendedSnpId }) =>
      postParsed<MSE>(
        `/mse/${mseId}/allocate`,
        { snp_id: snpId, note, recommended_snp_id: recommendedSnpId },
        MSESchema,
      ),
    onSuccess: (_d, { mseId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.mseList });
      // Allocation is what makes the certificate real, so the sidebar's
      // gating question has a new answer. Invalidate the whole "mse" prefix:
      // the officer allocating and the owner reading are different sessions,
      // but within one session the sidebar resolves through the same key.
      qc.invalidateQueries({ queryKey: ["mse"] });
      qc.invalidateQueries({ queryKey: queryKeys.modelHealth });
    },
  });
}

/* ── Catalogue Studio ──────────────────────────────────────────────── */

/** Multipart upload — deliberately NOT routed through `postParsed`, which
 *  sets a JSON content-type. The browser must set the multipart boundary. */
export function useCatalogueUpload() {
  return useMutation<UploadResult, Error, { file: File; mseId?: number; domain?: string }>({
    mutationFn: async ({ file, mseId, domain }) => {
      const fd = new FormData();
      fd.append("file", file);
      if (mseId) fd.append("mse_id", String(mseId));
      if (domain) fd.append("domain", domain);
      const res = await apiFetch("/catalogue/upload", { method: "POST", body: fd }, 120_000);
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(
          typeof detail?.detail === "string" ? detail.detail : "Upload failed",
        );
      }
      return parseOrThrow(UploadResultSchema, await res.json(), "/catalogue/upload");
    },
  });
}

/* ── Oversight ─────────────────────────────────────────────────────── */

export function useAudit(params = "") {
  return useQuery<AuditEntry[]>({
    queryKey: queryKeys.audit(params),
    queryFn: () => getParsed<AuditEntry[]>(`/audit/${params}`, AuditListSchema, []),
    enabled: signedIn(),
  });
}

const EMPTY_CLAIMS: ClaimsQueue = {
  claims: [],
  stats: {
    total: 0,
    pending: 0,
    auto_clearable: 0,
    flagged_red: 0,
    amount_pending: 0,
    amount_at_risk: 0,
  },
  source: null,
};

export function useClaimsQueue() {
  return useQuery<ClaimsQueue>({
    queryKey: queryKeys.claims,
    queryFn: () => getParsed<ClaimsQueue>("/claims/queue", ClaimsQueueSchema, EMPTY_CLAIMS),
    enabled: signedIn(),
  });
}

export function useDecideClaim() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { claimId: string; decision: string; note?: string }>({
    mutationFn: async ({ claimId, decision, note }) => {
      const res = await apiFetch("/claims/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, decision, note }),
      });
      if (!res.ok) throw new Error(`Decision failed (${res.status})`);
      return res.json().catch(() => ({}));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.claims }),
  });
}

export function useModelHealth() {
  return useQuery<HealthReport | null>({
    queryKey: queryKeys.modelHealth,
    queryFn: () =>
      getParsed<HealthReport | null>("/model-health/", HealthReportSchema.nullable(), null),
    enabled: signedIn(),
    staleTime: 60_000,
  });
}

export function useAppReviews(limit = 200) {
  return useQuery<ReviewSummary | null>({
    queryKey: [...queryKeys.appReviews, limit],
    queryFn: () =>
      getParsed<ReviewSummary | null>(
        `/reviews/?limit=${limit}`,
        ReviewSummarySchema.nullable(),
        null,
      ),
    enabled: signedIn(),
  });
}

/* ── Notifications ─────────────────────────────────────────────────── */

const EMPTY_FEED: NotificationFeed = { items: [], unread: 0 };

export function useNotifications() {
  return useQuery<NotificationFeed>({
    queryKey: queryKeys.notifications,
    queryFn: () => getParsed<NotificationFeed>("/notifications/", NotificationFeedSchema, EMPTY_FEED),
    enabled: signedIn(),
    // Officer decisions land while the owner is already sitting on a page, so
    // poll gently. Unlike a bare setInterval this pauses in a hidden tab.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}
