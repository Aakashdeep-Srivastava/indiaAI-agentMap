"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/auth";

/* ─── Types (mirror routes/claims.py) ─────────────────────────────── */

interface RuleCheck {
  rule: string;
  label: string;
  passed: boolean;
  note: string;
}

interface Claim {
  claim_id: string;
  claim_type: string;
  mse_id: number;
  mse_name: string;
  udyam_number: string;
  state: string | null;
  snp_name: string;
  channel: string;
  sku_count: number;
  claimed_amount: number;
  computed_amount: number;
  checks: RuleCheck[];
  passed_all: boolean;
  risk_score: number;
  risk_band: "green" | "yellow" | "red";
  anomalies: string[];
  decision: string | null;
  decided_by: string | null;
}

interface QueueStats {
  total: number;
  pending: number;
  auto_clearable: number;
  flagged_red: number;
  amount_pending: number;
  amount_at_risk: number;
}

const BAND_STYLES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ─── Page ────────────────────────────────────────────────────────── */

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/claims/queue");
      if (!res.ok) throw new Error("Could not load the claims queue");
      const data = await res.json();
      setClaims(data.claims);
      setStats(data.stats);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load claims");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(claim: Claim, decision: "approve" | "flag") {
    setBusy(claim.claim_id);
    try {
      const res = await apiFetch("/claims/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claim.claim_id, decision }),
      });
      if (res.ok) {
        setClaims((cs) =>
          cs.map((c) =>
            c.claim_id === claim.claim_id
              ? { ...c, decision, decided_by: "you" }
              : c,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  }

  const visible =
    filter === "pending" ? claims.filter((c) => !c.decision) : claims;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 shadow-lg shadow-brand-900/20">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-brand-900">
              Claims Copilot
            </h1>
            <p className="text-xs text-surface-500 sm:text-[13px]">
              TEAM incentive claims, verified against scheme rules automatically
            </p>
          </div>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-surface-200 bg-white">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "text-surface-500 hover:text-brand-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Demo provenance — honest stamp */}
      {note && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] leading-relaxed text-amber-800">
          {note}
        </p>
      )}

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Claims", value: String(stats.total) },
            { label: "Pending", value: String(stats.pending) },
            { label: "Auto-clearable", value: String(stats.auto_clearable) },
            { label: "High risk", value: String(stats.flagged_red) },
            { label: "Amount pending", value: inr(stats.amount_pending) },
            { label: "At risk", value: inr(stats.amount_at_risk) },
          ].map((s) => (
            <div key={s.label} className="glass-card px-4 py-3">
              <p className="font-display text-lg font-bold text-brand-900">
                {s.value}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-surface-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error / loading */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="glass-card py-12 text-center text-sm text-surface-500">
          Running scheme checks on the claim queue…
        </div>
      )}

      {/* Claims list */}
      <div className="space-y-3">
        {visible.map((c) => {
          const open = openId === c.claim_id;
          const failed = c.checks.filter((k) => !k.passed);
          return (
            <motion.div
              key={c.claim_id}
              layout
              className="glass-card overflow-hidden !p-0"
            >
              {/* Row */}
              <button
                onClick={() => setOpenId(open ? null : c.claim_id)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition-colors hover:bg-surface-50/60 sm:px-5"
              >
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${BAND_STYLES[c.risk_band]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {c.risk_band === "green"
                    ? "Low risk"
                    : c.risk_band === "yellow"
                      ? "Review"
                      : "High risk"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-900">
                    {c.mse_name}
                    <span className="ml-2 font-mono text-[10px] font-medium text-surface-400">
                      {c.claim_id}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-surface-500">
                    {c.claim_type === "catalogue"
                      ? `Catalogue · ${c.sku_count} SKUs · ${c.channel}`
                      : "Onboarding / digital marketing"}{" "}
                    · via {c.snp_name}
                    {c.state ? ` · ${c.state}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-brand-900">
                    {inr(c.claimed_amount)}
                  </p>
                  <p className="text-[10px] text-surface-400">
                    {failed.length === 0
                      ? "all checks pass"
                      : `${failed.length} check${failed.length > 1 ? "s" : ""} failing`}
                  </p>
                </div>
                {c.decision ? (
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${
                      c.decision === "approve"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.decision === "approve" ? "Approved" : "Flagged"}
                  </span>
                ) : (
                  <svg
                    className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${open ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </button>

              {/* Detail */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 border-t border-surface-100 px-4 py-4 sm:px-5">
                      {/* Checklist */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {c.checks.map((k) => (
                          <div
                            key={k.rule}
                            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                              k.passed
                                ? "border-emerald-100 bg-emerald-50/50"
                                : "border-red-200 bg-red-50/60"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                                k.passed ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            >
                              <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                {k.passed ? (
                                  <polyline points="20 6 9 17 4 12" />
                                ) : (
                                  <>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </>
                                )}
                              </svg>
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-brand-900">
                                {k.label}
                              </p>
                              <p className="truncate text-[11px] text-surface-500">
                                {k.note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Anomalies */}
                      {c.anomalies.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Anomaly signals
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {c.anomalies.map((a) => (
                              <li key={a} className="flex items-start gap-2 text-xs text-amber-800">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Amount + actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-surface-500">
                          Scheme computation:{" "}
                          <span className="font-mono font-bold text-brand-900">
                            {inr(c.computed_amount)}
                          </span>{" "}
                          · Claimed:{" "}
                          <span
                            className={`font-mono font-bold ${
                              c.claimed_amount > c.computed_amount
                                ? "text-red-600"
                                : "text-brand-900"
                            }`}
                          >
                            {inr(c.claimed_amount)}
                          </span>
                        </p>
                        {!c.decision && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => decide(c, "flag")}
                              disabled={busy === c.claim_id}
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              Flag for inquiry
                            </button>
                            <button
                              onClick={() => decide(c, "approve")}
                              disabled={busy === c.claim_id || !c.passed_all}
                              title={
                                c.passed_all
                                  ? "Approve claim"
                                  : "Cannot approve while checks fail"
                              }
                              className="btn-primary !px-4 !py-2 !text-xs"
                            >
                              {busy === c.claim_id ? "Saving…" : "Approve"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {!loading && visible.length === 0 && (
          <div className="glass-card py-12 text-center text-sm text-surface-500">
            No {filter === "pending" ? "pending " : ""}claims — the queue is clear.
          </div>
        )}
      </div>
    </div>
  );
}
