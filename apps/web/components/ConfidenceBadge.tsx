"use client";

import { motion } from "framer-motion";

const BAND_CONFIG = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    label: "High",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    label: "Medium",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.2)]",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    label: "Low",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.2)]",
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
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${c.bg} ${c.text} ${c.border} ${c.glow} ${
        size === "sm" ? "text-[11px]" : "text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse-dot`} />
      <span className="font-semibold">{c.label}</span>
      <span className="font-mono font-bold">{pct}</span>
    </motion.div>
  );
}
