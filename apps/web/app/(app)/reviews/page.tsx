"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, MessageSquare, RefreshCw } from "lucide-react";
import { useAppReviews } from "@/lib/queries";

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  name: string | null;
  persona: string | null;
  created_at: string;
}

interface Summary {
  count: number;
  average: number;
  distribution: Record<string, number>;
  reviews: Review[];
}

const PERSONA_LABEL: Record<string, string> = {
  mse: "MSE Owner",
  officer: "NSIC Officer",
  visitor: "Visitor",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function Stars({ n, size = "h-4 w-4" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= n ? "fill-saffron-400 text-saffron-400" : "text-surface-300"}`}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const {
    data,
    isPending: loading,
    error: queryError,
    refetch: fetchReviews,
  } = useAppReviews(200);
  const error = queryError ? "Failed to fetch reviews" : null;

  const maxBar = data ? Math.max(1, ...Object.values(data.distribution)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <MessageSquare className="h-4 w-4 text-brand-500" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
              Voice of the user
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-900">Product Feedback</h2>
          <p className="mt-1 text-sm text-surface-500">
            Reviews submitted from the public feedback page (
            <span className="font-mono text-xs">/feedback</span>).
          </p>
        </div>
        <button onClick={() => fetchReviews()} disabled={loading} className="btn-secondary !py-2 !text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Summary */}
      {data && data.count > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card flex flex-col items-center justify-center py-6">
            <span className="font-display text-4xl font-extrabold text-brand-900">
              {data.average.toFixed(1)}
            </span>
            <Stars n={Math.round(data.average)} />
            <span className="mt-1 text-xs text-surface-400">{data.count} review{data.count !== 1 ? "s" : ""}</span>
          </div>
          <div className="glass-card sm:col-span-2 py-5 px-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              Rating distribution
            </span>
            <div className="mt-3 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = data.distribution[String(star)] ?? 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-surface-500">{star}</span>
                    <Star className="h-3 w-3 fill-saffron-400 text-saffron-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full rounded-full bg-saffron-400"
                        style={{ width: `${(n / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-surface-400">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : !data || data.count === 0 ? (
        <div className="glass-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
            <MessageSquare className="h-6 w-6 text-surface-400" />
          </div>
          <p className="font-display text-sm font-medium text-surface-400">No feedback yet</p>
          <p className="mt-1 text-xs text-surface-400/70">
            Share the <span className="font-mono">/feedback</span> page — submissions appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Stars n={r.rating} />
                  {r.name && <span className="text-sm font-semibold text-brand-900">{r.name}</span>}
                  {r.persona && (
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                      {PERSONA_LABEL[r.persona] ?? r.persona}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap font-mono text-[11px] text-surface-400">
                  {formatTime(r.created_at)}
                </span>
              </div>
              {r.comment && (
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-surface-600">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
