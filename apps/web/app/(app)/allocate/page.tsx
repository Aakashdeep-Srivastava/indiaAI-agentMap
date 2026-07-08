"use client";

/* Official SNP Allocation — the NSIC act of mapping an approved MSE to a
 * Seller Network Participant: confirm the AI recommendation or reassign. */

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

interface MSE {
  id: number;
  name: string;
  udyam_number: string;
  district: string | null;
  state: string | null;
  status?: string | null;
  entrepreneur_name?: string | null;
  assigned_snp_id?: number | null;
  assigned_snp_name?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
}

interface MatchItem {
  snp_id: number;
  snp_name: string;
  composite_score: number;
  confidence_band: "green" | "yellow" | "red";
  fit_reasons?: string[];
  explainer_en: string;
}

const BAND = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-600 border-red-200",
};

export default function AllocatePage() {
  const [mses, setMses] = useState<MSE[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, MatchItem[]>>({});
  const [matchLoading, setMatchLoading] = useState(false);
  const [allocating, setAllocating] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`/mse/?limit=20`)
      .then((r) => r.json())
      .then((all: MSE[]) => setMses(all.filter((m) => m.status === "approved")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openMse(m: MSE) {
    setOpen(open === m.id ? null : m.id);
    if (!matches[m.id] && open !== m.id) {
      setMatchLoading(true);
      try {
        const res = await apiFetch(`/match/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mse_id: m.id, top_k: 3 }),
        }, 90000);
        if (res.ok) {
          const d = await res.json();
          setMatches((prev) => ({ ...prev, [m.id]: d.matches }));
        }
      } finally {
        setMatchLoading(false);
      }
    }
  }

  async function allocate(mseId: number, snp: MatchItem, isTop: boolean) {
    const note = isTop
      ? "Confirmed AI recommendation"
      : window.prompt("Reason for reassigning away from the top recommendation:") ?? "";
    if (!isTop && !note.trim()) return;
    setAllocating(snp.snp_id);
    try {
      const res = await apiFetch(`/mse/${mseId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snp_id: snp.snp_id, note }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMses((prev) =>
          prev.map((m) =>
            m.id === mseId
              ? {
                  ...m,
                  assigned_snp_id: updated.assigned_snp_id,
                  assigned_snp_name: updated.assigned_snp_name,
                  assigned_by: updated.assigned_by,
                  assigned_at: updated.assigned_at,
                }
              : m,
          ),
        );
      }
    } finally {
      setAllocating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
            NSIC Admin
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold text-brand-900">
          Official SNP Allocation
        </h2>
        <p className="mt-1 text-sm text-surface-500">
          Map approved enterprises to their Seller Network Participant —
          confirm the AI recommendation or reassign with a recorded reason.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : mses.length === 0 ? (
        <div className="glass-card py-14 text-center text-sm text-surface-400">
          No approved registrations awaiting allocation.
        </div>
      ) : (
        <div className="space-y-3">
          {mses.map((m) => (
            <div key={m.id} className="glass-card overflow-hidden">
              <button
                onClick={() => openMse(m)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-brand-900">
                    {m.name}
                  </p>
                  <p className="font-mono text-[11px] text-surface-400">
                    {m.udyam_number} · {m.district}, {m.state}
                  </p>
                </div>
                {m.assigned_snp_name ? (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Allocated → {m.assigned_snp_name}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-saffron-400/40 bg-saffron-500/5 px-3 py-1 text-[11px] font-semibold text-saffron-600">
                    Awaiting allocation
                  </span>
                )}
                <svg
                  className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${open === m.id ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {open === m.id && (
                <div className="border-t border-surface-100 bg-surface-50/50 px-5 py-4">
                  {m.assigned_snp_name && (
                    <p className="mb-3 text-xs text-surface-600">
                      Officially allocated to <b>{m.assigned_snp_name}</b> by{" "}
                      <b>{m.assigned_by}</b>
                      {m.assigned_at
                        ? ` · ${new Date(m.assigned_at).toLocaleString("en-IN")}`
                        : ""}{" "}
                      — reallocate below if required.
                    </p>
                  )}
                  {matchLoading && !matches[m.id] ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-surface-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      Running JodakAI recommendation…
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {(matches[m.id] ?? []).map((s, i) => (
                        <div
                          key={s.snp_id}
                          className={`rounded-xl border bg-white p-3.5 ${i === 0 ? "border-brand-300 shadow-sm" : "border-surface-200"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-brand-900">
                              {i === 0 && (
                                <span className="mr-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  AI PICK
                                </span>
                              )}
                              {s.snp_name}
                            </p>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${BAND[s.confidence_band]}`}>
                              {s.confidence_band}
                            </span>
                          </div>
                          {s.fit_reasons && s.fit_reasons.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {s.fit_reasons.slice(0, 3).map((r) => (
                                <li key={r} className="flex items-center gap-1.5 text-[11px] text-surface-600">
                                  <svg className="h-2.5 w-2.5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          )}
                          <button
                            onClick={() => allocate(m.id, s, i === 0)}
                            disabled={allocating !== null || m.assigned_snp_id === s.snp_id}
                            className={`mt-3 w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                              i === 0
                                ? "bg-brand-500 text-white hover:bg-brand-600"
                                : "border border-surface-300 bg-white text-surface-600 hover:border-brand-300"
                            }`}
                          >
                            {m.assigned_snp_id === s.snp_id
                              ? "Currently allocated"
                              : allocating === s.snp_id
                                ? "Allocating…"
                                : i === 0
                                  ? "Allocate (confirm AI)"
                                  : "Reassign here"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
