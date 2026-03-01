"use client";

import { ConfidenceBadge } from "./ConfidenceBadge";

interface HistoryItem {
  id: number;
  predicted_domain: string;
  confidence: number;
  model_version: string | null;
  created_at: string;
}

function confidenceBand(score: number): "green" | "yellow" | "red" {
  if (score >= 0.85) return "green";
  if (score >= 0.6) return "yellow";
  return "red";
}

const DOMAIN_NAMES: Record<string, string> = {
  RET10: "Grocery",
  RET12: "Fashion",
  RET14: "Electronics",
  RET16: "Home & Kitchen",
  RET18: "Health & Wellness",
};

interface Props {
  mseId: number;
  history: HistoryItem[];
}

export function ClassificationHistory({ mseId, history }: Props) {
  if (history.length === 0) {
    return (
      <div className="glass-card py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100">
          <svg
            className="h-5 w-5 text-surface-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="font-display text-sm font-medium text-surface-400">
          No classifications yet
        </p>
        <p className="mt-1 text-xs text-surface-400">
          MSE #{mseId} has not been classified
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden !rounded-2xl !p-0">
      {/* Header */}
      <div className="border-b border-surface-100 bg-surface-50/50 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50">
              <svg
                className="h-3.5 w-3.5 text-brand-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              Classification History
            </span>
          </div>
          <span className="rounded-md bg-surface-100 px-2 py-0.5 font-mono text-[10px] text-surface-500">
            MSE #{mseId}
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50/30">
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Date
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Domain
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Confidence
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Model
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {history.map((item) => (
            <tr
              key={item.id}
              className="transition-colors hover:bg-brand-50/20"
            >
              <td className="px-5 py-3 font-mono text-[11px] text-surface-500">
                {new Date(item.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-surface-600">
                    {item.predicted_domain}
                  </span>
                  <span className="text-xs text-surface-500">
                    {DOMAIN_NAMES[item.predicted_domain] ?? item.predicted_domain}
                  </span>
                </div>
              </td>
              <td className="px-5 py-3">
                <ConfidenceBadge
                  band={confidenceBand(item.confidence)}
                  score={item.confidence}
                  size="sm"
                />
              </td>
              <td className="px-5 py-3 font-mono text-[10px] text-surface-400">
                {item.model_version ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
