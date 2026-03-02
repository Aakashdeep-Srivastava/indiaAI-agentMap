"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

type DocStatus = "scanning" | "success" | "error";

interface DocPreviewProps {
  file: File;
  status: DocStatus;
  fieldsCount: number;
  errorMessage?: string;
  onDismiss: () => void;
}

export default function DocPreview({
  file,
  status,
  fieldsCount,
  errorMessage,
  onDismiss,
}: DocPreviewProps) {
  // Auto-dismiss after 5s on success
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [status, onDismiss]);

  const isPdf = file.name.toLowerCase().endsWith(".pdf");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`doc-preview-card ${status === "error" ? "doc-preview-error" : ""}`}
    >
      {/* Thumbnail / icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-50">
        {isPdf ? (
          <svg className="h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-xs font-medium text-brand-900">{file.name}</p>
        <p className="text-[11px] text-surface-400">
          {status === "scanning" && "Scanning with Sarvam Vision..."}
          {status === "success" && `Extracted ${fieldsCount} field${fieldsCount !== 1 ? "s" : ""}`}
          {status === "error" && (errorMessage || "Could not read document")}
        </p>
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {status === "scanning" && (
          <svg className="h-4 w-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {status === "success" && (
          <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {status === "error" && (
          <button onClick={onDismiss} className="text-surface-400 hover:text-surface-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
