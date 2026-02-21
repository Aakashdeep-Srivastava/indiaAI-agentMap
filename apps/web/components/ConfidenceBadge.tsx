"use client";

import { motion } from "framer-motion";

const BAND_CONFIG = {
  green: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    label: "High Confidence",
    dot: "bg-green-500",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    label: "Medium Confidence",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-300",
    label: "Low Confidence",
    dot: "bg-red-500",
  },
} as const;

interface Props {
  band: "green" | "yellow" | "red";
  score: number;
  size?: "sm" | "md";
}

export function ConfidenceBadge({ band, score, size = "md" }: Props) {
  const c = BAND_CONFIG[band];
  const pct = `${(score * 100).toFixed(1)}%`;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${c.bg} ${c.text} ${c.border} ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      <span className="font-medium">{c.label}</span>
      <span className="font-mono font-bold">{pct}</span>
    </motion.div>
  );
}
