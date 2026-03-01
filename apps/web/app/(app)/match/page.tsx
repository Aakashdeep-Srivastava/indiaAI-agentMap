"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SNPCard } from "@/components/SNPCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FactorBreakdown {
  domain_score: number;
  geo_score: number;
  commission_score: number;
  history_score: number;
  sentiment_score: number;
}

interface MatchItem {
  snp_id: number;
  snp_name: string;
  composite_score: number;
  confidence_band: "green" | "yellow" | "red";
  factors: FactorBreakdown;
  explainer_en: string;
  explainer_hi: string;
}

interface MatchResponse {
  mse_id: number;
  mse_name: string;
  predicted_domain: string | null;
  matches: MatchItem[];
}

const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  RET10: { label: "Grocery", icon: "\u{1F6D2}" },
  RET12: { label: "Fashion", icon: "\u{1F457}" },
  RET14: { label: "Electronics", icon: "\u{1F4F1}" },
  RET16: { label: "Home & Kitchen", icon: "\u{1F3E0}" },
  RET18: { label: "Health & Wellness", icon: "\u{1F33F}" },
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [mseId, setMseId] = useState("");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  useEffect(() => {
    const paramId = searchParams.get("mseId");
    if (paramId && !autoTriggered.current) {
      autoTriggered.current = true;
      setMseId(paramId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (autoTriggered.current && mseId && !result && !loading) {
      handleMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mseId]);

  async function handleMatch() {
    if (!mseId) return;
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API}/classify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mse_id: Number(mseId) }),
      });

      const res = await fetch(`${API}/match/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mse_id: Number(mseId), top_k: 5 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Match request failed");
      }

      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const domain = result?.predicted_domain
    ? DOMAIN_LABELS[result.predicted_domain]
    : null;

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
            <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="font-display text-sm font-semibold text-brand-900">
            Find Matches
          </h3>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="mse-id"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-500"
            >
              MSE ID
            </label>
            <input
              id="mse-id"
              type="number"
              min={1}
              placeholder="Enter MSE ID (e.g. 1)"
              value={mseId}
              onChange={(e) => setMseId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMatch()}
              className="input-field"
            />
          </div>
          <button
            onClick={handleMatch}
            disabled={loading || !mseId}
            className="btn-primary"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Find Matches
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <section className="animate-fade-up space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-brand-900">
                {result.mse_name}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-surface-400">
                  MSE #{result.mse_id}
                </span>
                {domain && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-surface-300" />
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      <span>{domain.icon}</span>
                      {result.predicted_domain} — {domain.label}
                    </span>
                  </>
                )}
                <span className="h-1 w-1 rounded-full bg-surface-300" />
                <span className="text-xs text-surface-500">
                  {result.matches.length} matches found
                </span>
              </div>
            </div>
            <ConfidenceBadge
              band={result.matches[0]?.confidence_band ?? "red"}
              score={result.matches[0]?.composite_score ?? 0}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.matches.map((m, i) => (
              <SNPCard key={m.snp_id} match={m} rank={i + 1} />
            ))}
          </div>

          {/* CTA to Review Queue */}
          <div className="flex justify-center pt-2">
            <a href="/review" className="btn-primary inline-flex">
              View in Review Queue
              <svg className="ml-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!result && !error && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
            <svg className="h-7 w-7 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="font-display text-sm font-medium text-surface-400">
            Enter an MSE ID above to begin matching
          </p>
          <p className="mt-1 text-xs text-surface-400/70">
            Try IDs 1–20 to see pre-seeded results
          </p>
        </div>
      )}
    </div>
  );
}
