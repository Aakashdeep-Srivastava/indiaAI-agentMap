"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface MSE {
  id: number;
  udyam_number: string;
  name: string;
  description: string;
  state: string | null;
  district: string | null;
}

export default function ReviewPage() {
  const [mses, setMses] = useState<MSE[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/mse/?limit=20`)
      .then((r) => r.json())
      .then(setMses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <a href="/register" className="btn-saffron mt-4 inline-flex !text-xs !py-2">
            Register First MSE
          </a>
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
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {mses.map((mse, i) => (
                <tr
                  key={mse.id}
                  className="group transition-colors hover:bg-brand-50/30"
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
                  <td className="px-5 py-4 text-right">
                    <a
                      href={`/match?mseId=${mse.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-glow"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                      Match
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
