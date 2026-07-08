"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/auth";

interface MSE {
  id: number;
  udyam_number: string;
  name: string;
  description: string;
  state: string | null;
  district: string | null;
  pin_code?: string | null;
  status?: string | null;
  entrepreneur_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  address?: string | null;
  org_type?: string | null;
  major_activity?: string | null;
  transaction_type?: string | null;
  pan_number?: string | null;
  gst_number?: string | null;
  turnover_band?: string | null;
  products?: string | null;
  consent_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending_review: "bg-saffron-500/10 text-saffron-600 border-saffron-400/40",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function ReviewPage() {
  const [mses, setMses] = useState<MSE[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`/mse/?limit=20`)
      .then((r) => r.json())
      .then(setMses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function review(id: number, action: "approve" | "reject") {
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt(
        "Reason for rejection (recorded on the audit trail and shown to the applicant):",
      );
      if (note === null) return; // officer cancelled
      if (!note.trim()) {
        window.alert("A rejection must carry a reason.");
        return;
      }
    }
    setActing(id);
    try {
      const res = await apiFetch(`/mse/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMses((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status: updated.status,
                  reviewed_by: updated.reviewed_by,
                  reviewed_at: updated.reviewed_at,
                  review_note: updated.review_note,
                }
              : m,
          ),
        );
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
              NSIC Admin
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-900">
            Review Queue
          </h2>
          <p className="mt-1 text-sm text-surface-500">
            Review registered MSEs and trigger classification or matching.
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white px-4 py-2">
          <span className="text-xs text-surface-500">Total MSEs</span>
          <p className="font-display text-xl font-bold text-brand-900">
            {loading ? "—" : mses.length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : mses.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
            <svg className="h-6 w-6 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
            </svg>
          </div>
          <p className="font-display text-sm font-medium text-surface-400">
            No MSEs registered yet
          </p>
          <Link href="/register" className="btn-saffron mt-4 inline-flex !text-xs !py-2">
            Register First MSE
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden !rounded-2xl !p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  ID
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Udyam Number
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Business Name
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  State
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {mses.map((mse, i) => (
                <React.Fragment key={mse.id}>
                <tr
                  onClick={() => setExpanded(expanded === mse.id ? null : mse.id)}
                  className="group cursor-pointer transition-colors hover:bg-brand-50/30"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 font-mono text-xs font-medium text-surface-600">
                      {mse.id}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-surface-500">
                    {mse.udyam_number}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-display text-sm font-semibold text-brand-900">
                      {mse.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-surface-500">
                    {mse.state ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        STATUS_STYLE[mse.status ?? "approved"] ?? STATUS_STYLE.approved
                      }`}
                    >
                      {(mse.status ?? "approved").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {mse.status === "pending_review" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(mse.id); }}
                          disabled={acting === mse.id}
                          className="rounded-lg border border-saffron-400/50 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-600 transition hover:bg-saffron-500/20 disabled:opacity-50"
                        >
                          Review
                        </button>
                      )}
                      <a
                        href={`/match?mseId=${mse.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-glow"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                        Match
                      </a>
                    </div>
                  </td>
                </tr>

                {/* ── Audit card: the data the officer verifies ── */}
                {expanded === mse.id && (
                  <tr className="bg-surface-50/60">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="grid gap-x-8 gap-y-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          ["Entrepreneur", mse.entrepreneur_name],
                          ["Email", mse.email],
                          ["Mobile", mse.mobile_number],
                          ["Organization", mse.org_type],
                          ["Activity", mse.major_activity],
                          ["Transactions", mse.transaction_type],
                          ["PAN", mse.pan_number],
                          ["GST", mse.gst_number ?? "— not provided"],
                          ["Classification", mse.turnover_band],
                          ["Address", mse.address],
                          ["Location", [mse.district, mse.state, mse.pin_code].filter(Boolean).join(", ")],
                          ["Consent", mse.consent_at ? `Recorded ${new Date(mse.consent_at).toLocaleString("en-IN")}` : "—"],
                        ].map(([label, value]) => (
                          <div key={label as string}>
                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                              {label}
                            </span>
                            <span className="font-medium text-brand-900">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-surface-200 pt-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                          Business Description (AI-extracted)
                        </span>
                        <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-surface-600">
                          {mse.description}
                        </p>
                        {mse.products && (
                          <p className="mt-1.5 text-xs text-surface-500">
                            <b className="text-surface-600">Products:</b> {mse.products}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-surface-200 pt-3">
                        {mse.reviewed_by ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] text-surface-600">
                            <svg className="h-3 w-3 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                            {mse.status === "approved" ? "Approved" : "Rejected"} by{" "}
                            <b>{mse.reviewed_by}</b>
                            {mse.reviewed_at ? ` · ${new Date(mse.reviewed_at).toLocaleString("en-IN")}` : ""}
                            {mse.review_note ? (
                              <span className="text-red-600"> — Reason: {mse.review_note}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-[11px] text-saffron-600">
                            Awaiting NSIC confirmation — verify the details above, then approve.
                          </span>
                        )}
                        {mse.status === "pending_review" && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); review(mse.id, "approve"); }}
                              disabled={acting === mse.id}
                              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              Approve Registration
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); review(mse.id, "reject"); }}
                              disabled={acting === mse.id}
                              className="rounded-lg border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
