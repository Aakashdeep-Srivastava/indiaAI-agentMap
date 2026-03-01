"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  performed_by: string | null;
  created_at: string;
}

const ACTION_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  mse_registered: { bg: "bg-saffron-50", text: "text-saffron-600", dot: "bg-saffron-400" },
  classified: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  matched: { bg: "bg-brand-50", text: "text-brand-600", dot: "bg-brand-400" },
};

const DEFAULT_STYLE = { bg: "bg-surface-50", text: "text-surface-600", dot: "bg-surface-400" };

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter
        ? `${API}/audit/?limit=50&action=${filter}`
        : `${API}/audit/?limit=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      setLogs(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
              Responsible AI
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-900">
            Audit Trail
          </h2>
          <p className="mt-1 text-sm text-surface-500">
            Immutable log of all classification and matching decisions for
            Responsible AI compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field !py-2 !text-xs"
          >
            <option value="">All Actions</option>
            <option value="mse_registered">Registered</option>
            <option value="classified">Classified</option>
            <option value="matched">Matched</option>
          </select>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-secondary !py-2 !text-xs"
          >
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
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-surface-400">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-saffron-400" />
          Registrations
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          Classifications
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-400" />
          Matches
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
            <svg className="h-6 w-6 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="font-display text-sm font-medium text-surface-400">
            No audit logs yet
          </p>
          <p className="mt-1 text-xs text-surface-400/70">
            Register, classify, or match an MSE to generate audit entries.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden !rounded-2xl !p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Timestamp
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Action
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Entity
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Details
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Performed By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {logs.map((log) => {
                const style = ACTION_STYLES[log.action] ?? DEFAULT_STYLE;
                return (
                  <tr
                    key={log.id}
                    className="group transition-colors hover:bg-brand-50/30"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-surface-500">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {log.entity_type && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-surface-500">
                          <span className="uppercase">{log.entity_type}</span>
                          {log.entity_id != null && (
                            <span className="rounded bg-surface-100 px-1.5 py-0.5 font-bold text-brand-900">
                              #{log.entity_id}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-surface-600">
                      {log.details ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-surface-400">
                      {log.performed_by ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
