"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";

/* ── API response types (mirrors GET /model-health/) ─────────── */
interface Alert {
  severity: "red" | "amber";
  code: string;
  message: string;
}
interface TrendPoint {
  week_start: string;
  count: number;
  avg_confidence: number;
  p25_confidence: number;
  fallback_share: number;
}
interface EngineFamily {
  family: "trained" | "llm" | "fallback" | "other";
  label: string;
  count: number;
  share: number;
}
interface DomainRow {
  code: string;
  name: string;
  count: number;
  avg_confidence: number;
  low_conf_share: number;
  baseline_f1: number | null;
  baseline_support: number | null;
  status: "ok" | "watch" | "no_baseline";
}
interface HealthReport {
  generated_at: string;
  status: "green" | "amber" | "red";
  alerts: Alert[];
  thresholds: { fallback_alert: number; override_alert: number; low_confidence: number };
  summary: {
    total_classifications: number;
    avg_confidence: number | null;
    p25_confidence: number | null;
    low_conf_share: number;
    window_weeks: number;
  };
  engine_mix: {
    families: EngineFamily[];
    engines: { engine: string; count: number }[];
    trained_share: number;
    llm_share: number;
    fallback_share: number;
  };
  confidence_trend: TrendPoint[];
  oversight: {
    reviews_decided: number;
    approved: number;
    rejected: number;
    rejection_rate: number;
    allocations: number;
    allocation_overrides: number;
    allocation_override_rate: number;
  };
  domains: DomainRow[];
  baseline: {
    trained: string | null;
    model: string | null;
    test_accuracy: number | null;
    test_macro_f1: number | null;
    covered_domains: string[];
  };
}

/* ── Palette (validated: lightness, chroma, CVD, contrast on #F8F9FC) ── */
const FAMILY_COLORS: Record<EngineFamily["family"], string> = {
  trained: "#1B4FCC",
  llm: "#E8680C",
  fallback: "#B42318",
  other: "#7C3AED",
};

const STATUS_BANNER: Record<HealthReport["status"], { bg: string; border: string; text: string; label: string }> = {
  green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "Healthy" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "Watch" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", label: "Degraded — retrain recommended" },
};

const DOMAIN_BADGE: Record<DomainRow["status"], { cls: string; dot: string; label: string }> = {
  ok: { cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "In range" },
  watch: { cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "Watch" },
  no_baseline: { cls: "bg-surface-50 text-surface-500", dot: "bg-surface-400", label: "Zero-shot" },
};

const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${(v * 100).toFixed(v * 100 >= 10 ? 0 : 1)}%`;

const weekLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

/* ── Weekly confidence trend (avg + p25) — inline SVG line chart ── */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const PAD = { l: 44, r: 64, t: 14, b: 30 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length > 1 ? (i * iw) / (points.length - 1) : iw / 2);
  const y = (v: number) => PAD.t + (1 - v) * ih;
  const path = (get: (p: TrendPoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(get(p)).toFixed(1)}`).join(" ");

  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-surface-400">
        No classifications recorded in this window yet.
      </p>
    );
  }

  const last = points.length - 1;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly classification confidence trend">
        {/* gridlines + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="#E4E7F1" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="#9EA5BE">
              {Math.round(g * 100)}%
            </text>
          </g>
        ))}
        {/* x labels */}
        {points.map((p, i) => (
          <text key={p.week_start} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#9EA5BE">
            {weekLabel(p.week_start)}
          </text>
        ))}
        {/* series lines */}
        <path d={path((p) => p.avg_confidence)} fill="none" stroke="#1B4FCC" strokeWidth="2" strokeLinejoin="round" />
        <path d={path((p) => p.p25_confidence)} fill="none" stroke="#E8680C" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        {/* direct labels at line end (only when there is a line to label) */}
        {points.length > 1 && (
          <>
            <text x={x(last) + 8} y={y(points[last].avg_confidence) + 3.5} fontSize="10" fontWeight="600" fill="#4A5170">
              Avg
            </text>
            <text x={x(last) + 8} y={y(points[last].p25_confidence) + 3.5} fontSize="10" fontWeight="600" fill="#4A5170">
              P25
            </text>
          </>
        )}
        {/* markers + hover targets */}
        {points.map((p, i) => (
          <g key={p.week_start}>
            <circle cx={x(i)} cy={y(p.avg_confidence)} r="4" fill="#1B4FCC" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx={x(i)} cy={y(p.p25_confidence)} r="4" fill="#E8680C" stroke="#FFFFFF" strokeWidth="2" />
            <rect
              x={x(i) - 14}
              y={PAD.t}
              width="28"
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="#9EA5BE" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-card"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-surface-400">
            Week of {weekLabel(points[hover].week_start)} · {points[hover].count} classified
          </p>
          <p className="text-xs text-surface-600">
            Avg <span className="font-semibold text-brand-900">{pct(points[hover].avg_confidence)}</span>
            {" · "}P25 <span className="font-semibold text-brand-900">{pct(points[hover].p25_confidence)}</span>
            {" · "}Fallback <span className="font-semibold text-brand-900">{pct(points[hover].fallback_share)}</span>
          </p>
        </div>
      )}
      {/* legend */}
      <div className="mt-1 flex items-center gap-5 text-xs text-surface-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: "#1B4FCC" }} />
          Average confidence
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="2" aria-hidden>
            <line x1="0" x2="16" y1="1" y2="1" stroke="#E8680C" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          25th percentile
        </span>
      </div>
    </div>
  );
}

/* ── Engine-mix stacked bar + legend ─────────────────────────── */
function EngineMix({ families, engines }: { families: EngineFamily[]; engines: { engine: string; count: number }[] }) {
  const active = families.filter((f) => f.count > 0);
  if (active.length === 0) {
    return <p className="py-6 text-center text-sm text-surface-400">No engine data yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-lg">
        {active.map((f) => (
          <div
            key={f.family}
            title={`${f.label}: ${f.count} (${pct(f.share)})`}
            style={{ width: `${Math.max(f.share * 100, 1.5)}%`, background: FAMILY_COLORS[f.family] }}
          />
        ))}
      </div>
      <div className="space-y-2.5">
        {families.map((f) => (
          <div key={f.family} className="flex items-center gap-2.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: FAMILY_COLORS[f.family] }} />
            <span className={`truncate ${f.count > 0 ? "text-surface-600" : "text-surface-400"}`}>{f.label}</span>
            <span className="ml-auto shrink-0 whitespace-nowrap font-mono font-semibold text-brand-900">
              {f.count} <span className="font-normal text-surface-400">({pct(f.share)})</span>
            </span>
          </div>
        ))}
      </div>
      <details className="text-xs text-surface-400">
        <summary className="cursor-pointer select-none hover:text-surface-600">Exact engine stamps</summary>
        <ul className="mt-2 space-y-1 font-mono">
          {engines.map((e) => (
            <li key={e.engine} className="flex justify-between">
              <span>{e.engine}</span>
              <span className="font-semibold text-surface-600">{e.count}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/* ── Small labelled meter (rate vs threshold) ────────────────── */
function RateMeter({ rate, threshold, breach }: { rate: number; threshold: number; breach: boolean }) {
  const max = Math.max(threshold * 2, rate * 1.2, 0.01);
  return (
    <div className="relative mt-2 h-2.5 w-full rounded-full bg-surface-100">
      <div
        className={`h-2.5 rounded-full ${breach ? "bg-red-500" : "bg-brand-500"}`}
        style={{ width: `${Math.min((rate / max) * 100, 100)}%` }}
      />
      <div
        className="absolute top-[-3px] h-4 w-0.5 rounded bg-surface-400"
        style={{ left: `${(threshold / max) * 100}%` }}
        title={`Alert threshold ${pct(threshold)}`}
      />
    </div>
  );
}

export default function ModelHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/model-health/");
      if (!res.ok) throw new Error("Failed to load model health report");
      setReport(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const banner = report ? STATUS_BANNER[report.status] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
              Responsible AI
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-900">Model Health</h2>
          <p className="mt-1 text-sm text-surface-500">
            Degradation monitor — live drift signals computed from data the platform
            already records. No raw text leaves the audit trail.
          </p>
        </div>
        <button onClick={fetchReport} disabled={loading} className="btn-secondary !py-2 !text-xs">
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {loading && !report ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : report && banner ? (
        <>
          {/* Status banner */}
          <div className={`rounded-2xl border px-5 py-4 ${banner.bg} ${banner.border}`}>
            <div className={`flex items-center gap-2 text-sm font-semibold ${banner.text}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {report.status === "green" ? (
                  <>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </>
                ) : (
                  <>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                )}
              </svg>
              {banner.label}
            </div>
            {report.alerts.length > 0 ? (
              <ul className={`mt-2 space-y-1 text-sm ${banner.text}`}>
                {report.alerts.map((a) => (
                  <li key={a.code} className="flex gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase leading-5">
                      {a.severity}
                    </span>
                    <span className="opacity-90">{a.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-1 text-sm opacity-90 ${banner.text}`}>
                All degradation signals are within thresholds.
              </p>
            )}
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Classifications", value: report.summary.total_classifications },
              { label: "Avg confidence", value: pct(report.summary.avg_confidence) },
              { label: "P25 confidence", value: pct(report.summary.p25_confidence) },
              { label: "Low-confidence", value: pct(report.summary.low_conf_share) },
              { label: "Fallback share", value: pct(report.engine_mix.fallback_share) },
              { label: "Override rate", value: pct(report.oversight.allocation_override_rate) },
            ].map((s) => (
              <div key={s.label} className="glass-card px-4 py-3">
                <p className="font-display text-lg font-bold text-brand-900">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-surface-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Trend + engine mix */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="glass-card p-5 lg:col-span-3">
              <h3 className="mb-1 font-display text-sm font-bold text-brand-900">
                Confidence trend
              </h3>
              <p className="mb-3 text-xs text-surface-400">
                Weekly VargBot classification confidence (last {report.summary.window_weeks} weeks).
                A sagging 25th percentile means live input is drifting from the training corpus.
              </p>
              <TrendChart points={report.confidence_trend} />
            </div>
            <div className="glass-card p-5 lg:col-span-2">
              <h3 className="mb-1 font-display text-sm font-bold text-brand-900">Engine mix</h3>
              <p className="mb-3 text-xs text-surface-400">
                Which engine answered, from the honest per-result stamps. A rising
                keyword-fallback share is the clearest degradation signal.
              </p>
              <EngineMix families={report.engine_mix.families} engines={report.engine_mix.engines} />
            </div>
          </div>

          {/* Officer override signals */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-card p-5">
              <h3 className="mb-1 font-display text-sm font-bold text-brand-900">
                Registration reviews
              </h3>
              <p className="mb-3 text-xs text-surface-400">
                Officer decisions on AI-processed registrations — the human ground truth.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-brand-900">
                  {pct(report.oversight.rejection_rate)}
                </span>
                <span className="text-xs text-surface-500">
                  rejected of {report.oversight.reviews_decided} decided
                  ({report.oversight.approved} approved · {report.oversight.rejected} rejected)
                </span>
              </div>
              <RateMeter
                rate={report.oversight.rejection_rate}
                threshold={0.25}
                breach={report.oversight.rejection_rate > 0.25}
              />
            </div>
            <div className="glass-card p-5">
              <h3 className="mb-1 font-display text-sm font-bold text-brand-900">
                Allocation overrides
              </h3>
              <p className="mb-3 text-xs text-surface-400">
                Officer assigned a different SNP than the AI&apos;s top recommendation.
                Above {pct(report.thresholds.override_alert)} means the matcher is
                drifting from officer judgment.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-brand-900">
                  {pct(report.oversight.allocation_override_rate)}
                </span>
                <span className="text-xs text-surface-500">
                  {report.oversight.allocation_overrides} of {report.oversight.allocations} allocations
                </span>
              </div>
              <RateMeter
                rate={report.oversight.allocation_override_rate}
                threshold={report.thresholds.override_alert}
                breach={report.oversight.allocation_override_rate > report.thresholds.override_alert}
              />
            </div>
          </div>

          {/* Per-domain table */}
          <div className="glass-card overflow-x-auto !p-0">
            <div className="px-5 pb-1 pt-4">
              <h3 className="font-display text-sm font-bold text-brand-900">
                Per-domain drift vs frozen baseline
              </h3>
              <p className="mt-0.5 text-xs text-surface-400">
                Live confidence per predicted ONDC domain, against the held-out evaluation
                frozen at training time
                {report.baseline.trained ? ` (${report.baseline.trained})` : ""}. Domains
                outside the training corpus are served zero-shot by the LLM.
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  {["Domain", "Volume", "Avg conf", "Low-conf", "Baseline F1", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {report.domains.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-surface-400">
                      No classifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  report.domains.map((d) => {
                    const badge = DOMAIN_BADGE[d.status];
                    return (
                      <tr key={d.code} className="transition-colors hover:bg-brand-50/30">
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-bold text-brand-900">{d.code}</span>
                          <span className="ml-2 text-xs text-surface-500">{d.name}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-surface-600">{d.count}</td>
                        <td className="px-5 py-3 font-mono text-xs text-surface-600">{pct(d.avg_confidence)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-surface-600">{pct(d.low_conf_share)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-surface-600">
                          {d.baseline_f1 != null ? d.baseline_f1.toFixed(3) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Baseline footnote */}
          <p className="text-xs text-surface-400">
            Frozen baseline: {report.baseline.model ?? "trained classifier"} — held-out
            accuracy {pct(report.baseline.test_accuracy)}, macro-F1{" "}
            {report.baseline.test_macro_f1?.toFixed(3) ?? "—"}. Alert thresholds:
            fallback share {pct(report.thresholds.fallback_alert)}, override rate{" "}
            {pct(report.thresholds.override_alert)}, confidence gate{" "}
            {pct(report.thresholds.low_confidence)}. Read-only analytics — computed from
            existing classification stamps and officer audit records.
          </p>
        </>
      ) : null}
    </div>
  );
}
