"use client";

import { useState } from "react";
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

export default function DashboardPage() {
  const [mseId, setMseId] = useState("");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMatch() {
    if (!mseId) return;
    setLoading(true);
    setError(null);
    try {
      // First classify, then match
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

  return (
    <div className="space-y-8">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 p-8 text-white">
        <h2 className="text-2xl font-bold">MSE-to-SNP Matching Dashboard</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Enter an MSE ID to classify their business into an ONDC domain and
          find the best Seller Network Participants using our multi-factor AI
          scoring engine.
        </p>
      </section>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label
            htmlFor="mse-id"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            MSE ID
          </label>
          <input
            id="mse-id"
            type="number"
            min={1}
            placeholder="e.g. 1"
            value={mseId}
            onChange={(e) => setMseId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-ashoka-500 focus:outline-none focus:ring-2 focus:ring-ashoka-500/20"
          />
        </div>
        <button
          onClick={handleMatch}
          disabled={loading || !mseId}
          className="rounded-lg bg-ashoka-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Find Matches"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────── */}
      {result && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-navy-800">
                Matches for {result.mse_name}
              </h3>
              {result.predicted_domain && (
                <p className="text-sm text-slate-500">
                  Predicted ONDC Domain:{" "}
                  <span className="font-mono font-semibold text-ashoka-500">
                    {result.predicted_domain}
                  </span>
                </p>
              )}
            </div>
            <ConfidenceBadge
              band={result.matches[0]?.confidence_band ?? "red"}
              score={result.matches[0]?.composite_score ?? 0}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.matches.map((m, i) => (
              <SNPCard key={m.snp_id} match={m} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
