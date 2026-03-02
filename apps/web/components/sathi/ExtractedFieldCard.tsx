"use client";

import { motion } from "framer-motion";

interface ExtractedFieldCardProps {
  label: string;
  value: string;
  filled: boolean;
  recentlyFilled: boolean;
  onClick?: () => void;
}

export default function ExtractedFieldCard({
  label,
  value,
  filled,
  recentlyFilled,
  onClick,
}: ExtractedFieldCardProps) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={`field-card-voice group text-left ${
        recentlyFilled
          ? "field-card-voice-glow"
          : filled
            ? "field-card-voice-filled"
            : "field-card-voice-empty"
      }`}
    >
      {/* Label */}
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>

      {/* Value or placeholder */}
      {filled ? (
        <div className="mt-0.5 flex items-center gap-1.5">
          <svg
            className="h-3 w-3 shrink-0 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="truncate text-xs font-medium">{value}</p>
        </div>
      ) : (
        <p className="mt-0.5 text-[10px] opacity-30">---</p>
      )}
    </motion.button>
  );
}
