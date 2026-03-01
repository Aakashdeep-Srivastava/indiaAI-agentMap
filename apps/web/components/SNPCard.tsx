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

const FACTORS: {
  key: keyof FactorBreakdown;
  label: string;
  weight: string;
  gradient: string;
  bg: string;
}[] = [
  {
    key: "domain_score",
    label: "Domain",
    weight: "0.35",
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "geo_score",
    label: "Geography",
    weight: "0.20",
    gradient: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "commission_score",
    label: "Commission",
    weight: "0.15",
    gradient: "from-amber-400 to-amber-500",
    bg: "bg-amber-50",
  },
  {
    key: "history_score",
    label: "History",
    weight: "0.20",
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
  },
  {
    key: "sentiment_score",
    label: "Support",
    weight: "0.10",
    gradient: "from-rose-400 to-rose-500",
    bg: "bg-rose-50",
  },
];

interface Props {
  match: MatchItem;
  rank: number;
}

export function SNPCard({ match, rank }: Props) {
  const [lang, setLang] = useState<"en" | "hi">("en");

  const rankColors = [
    "from-saffron-500 to-saffron-400",
    "from-brand-500 to-brand-400",
    "from-surface-500 to-surface-400",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1, duration: 0.4, ease: "easeOut" }}
      className="glass-card overflow-hidden"
    >
      {/* Rank + Header */}
      <div className="flex items-start gap-4 p-5 pb-0">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
            rankColors[rank - 1] ?? rankColors[2]
          } font-display text-sm font-bold text-white shadow-sm`}
        >
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-display text-base font-bold text-brand-900 leading-tight">
                {match.snp_name}
              </h4>
              <p className="mt-0.5 font-mono text-[11px] text-surface-400">
                SNP-{match.snp_id}
              </p>
            </div>
            <ConfidenceBadge
              band={match.confidence_band}
              score={match.composite_score}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Composite score arc */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between rounded-xl bg-surface-50 px-4 py-3">
          <span className="text-xs font-medium text-surface-500">
            Composite Score
          </span>
          <span className="font-display text-lg font-bold text-brand-900">
            {(match.composite_score * 100).toFixed(1)}
            <span className="text-xs font-normal text-surface-400">%</span>
          </span>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2.5 px-5 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
            Factor Breakdown
          </span>
        </div>

        {FACTORS.map((f) => {
          const value = match.factors[f.key];
          const pct = (value * 100).toFixed(0);
          return (
            <div key={f.key} className="group">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-brand-900">
                    {f.label}
                  </span>
                  <span className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[10px] text-surface-400">
                    w={f.weight}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-brand-800">
                  {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{
                    duration: 0.7,
                    delay: rank * 0.1 + 0.2,
                    ease: "easeOut",
                  }}
                  className={`h-full rounded-full bg-gradient-to-r ${f.gradient}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Explainer */}
      <div className="m-5 mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500">
              <svg
                className="h-3 w-3 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                <path d="M18 14v1a6 6 0 01-12 0v-1" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
              AI Explainer
            </span>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-surface-200 bg-white">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                lang === "en"
                  ? "bg-brand-500 text-white"
                  : "text-surface-500 hover:text-brand-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                lang === "hi"
                  ? "bg-brand-500 text-white"
                  : "text-surface-500 hover:text-brand-900"
              }`}
            >
              HI
            </button>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-surface-600">
          {lang === "en" ? match.explainer_en : match.explainer_hi}
        </p>
      </div>
    </motion.div>
  );
}
