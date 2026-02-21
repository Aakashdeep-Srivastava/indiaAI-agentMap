"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ConfidenceBadge } from "./ConfidenceBadge";

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

const FACTOR_META: { key: keyof FactorBreakdown; label: string; weight: string; color: string }[] = [
  { key: "domain_score", label: "Domain Fit", weight: "0.35", color: "bg-blue-500" },
  { key: "geo_score", label: "Geo Match", weight: "0.20", color: "bg-green-500" },
  { key: "commission_score", label: "Commission", weight: "0.15", color: "bg-amber-500" },
  { key: "history_score", label: "History", weight: "0.20", color: "bg-purple-500" },
  { key: "sentiment_score", label: "Sentiment", weight: "0.10", color: "bg-pink-500" },
];

interface Props {
  match: MatchItem;
  rank: number;
}

export function SNPCard({ match, rank }: Props) {
  const [lang, setLang] = useState<"en" | "hi">("en");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
              {rank}
            </span>
            <h4 className="font-semibold text-navy-800">{match.snp_name}</h4>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            SNP ID: {match.snp_id}
          </p>
        </div>
        <ConfidenceBadge
          band={match.confidence_band}
          score={match.composite_score}
          size="sm"
        />
      </div>

      {/* Factor bars */}
      <div className="mb-4 space-y-2">
        {FACTOR_META.map((f) => {
          const value = match.factors[f.key];
          return (
            <div key={f.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {f.label}{" "}
                  <span className="text-slate-400">({f.weight})</span>
                </span>
                <span className="font-mono">
                  {(value * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{ duration: 0.5, delay: rank * 0.08 }}
                  className={`h-full rounded-full ${f.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Explainer */}
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            AI Explainer
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setLang("en")}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                lang === "en"
                  ? "bg-ashoka-500 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                lang === "hi"
                  ? "bg-ashoka-500 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              HI
            </button>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          {lang === "en" ? match.explainer_en : match.explainer_hi}
        </p>
      </div>
    </motion.div>
  );
}
