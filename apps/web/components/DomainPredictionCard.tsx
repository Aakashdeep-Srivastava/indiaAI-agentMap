"use client";

import { motion } from "framer-motion";
import { ConfidenceBadge } from "./ConfidenceBadge";

const DOMAIN_ICONS: Record<string, string> = {
  RET10: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  RET12: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  RET14: "M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  RET16: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
  RET18: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
};

function confidenceBand(score: number): "green" | "yellow" | "red" {
  if (score >= 0.85) return "green";
  if (score >= 0.6) return "yellow";
  return "red";
}

interface Props {
  domain: string;
  domainName: string;
  confidence: number;
  rank: number;
  isSelected?: boolean;
}

export function DomainPredictionCard({
  domain,
  domainName,
  confidence,
  rank,
  isSelected = false,
}: Props) {
  const rankColors = [
    "from-saffron-500 to-saffron-400",
    "from-brand-500 to-brand-400",
    "from-surface-500 to-surface-400",
  ];

  const barColors = [
    "from-saffron-500 to-saffron-400",
    "from-brand-400 to-brand-500",
    "from-surface-400 to-surface-500",
  ];

  const band = confidenceBand(confidence);
  const iconPath = DOMAIN_ICONS[domain] || DOMAIN_ICONS.RET10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (rank - 1) * 0.12, duration: 0.45, ease: "easeOut" }}
      className={`glass-card relative overflow-hidden p-5 ${
        isSelected ? "ring-2 ring-brand-500/30 border-brand-300" : ""
      }`}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
              rankColors[rank - 1] ?? rankColors[2]
            } font-display text-sm font-bold text-white shadow-sm`}
          >
            #{rank}
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-surface-400">
              {domain}
            </span>
            <h4 className="font-display text-base font-bold leading-tight text-brand-900">
              {domainName}
            </h4>
          </div>
        </div>

        {/* Domain icon */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-50">
          <svg
            className="h-4.5 w-4.5 text-surface-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
            Confidence
          </span>
          <span className="font-mono text-sm font-bold text-brand-900">
            {(confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{
              duration: 0.8,
              delay: (rank - 1) * 0.12 + 0.3,
              ease: "easeOut",
            }}
            className={`h-full rounded-full bg-gradient-to-r ${
              barColors[rank - 1] ?? barColors[2]
            }`}
          />
        </div>
      </div>

      {/* Confidence badge */}
      <div className="mt-3 flex justify-end">
        <ConfidenceBadge band={band} score={confidence} size="sm" />
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500"
        >
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
