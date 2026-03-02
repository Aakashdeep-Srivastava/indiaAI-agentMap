"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: number;
  code: string;
  name: string;
}

interface Domain {
  id: number;
  code: string;
  name: string;
  description: string | null;
  categories: Category[];
}

interface Props {
  domains: Domain[];
  highlightedDomain?: string;
  highlightedCategory?: string;
}

export function TaxonomyBrowser({ domains, highlightedDomain, highlightedCategory }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the highlighted domain
  useEffect(() => {
    if (highlightedDomain) {
      setExpanded((prev) => new Set([...prev, highlightedDomain]));
    }
  }, [highlightedDomain]);

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="glass-card overflow-hidden !p-0">
      {/* Header */}
      <div className="border-b border-surface-100 bg-surface-50/50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500">
            <svg
              className="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
            ONDC Taxonomy Browser
          </span>
        </div>
      </div>

      {/* Domain rows */}
      <div className="divide-y divide-surface-100">
        {domains.map((domain) => {
          const isExpanded = expanded.has(domain.code);
          const isHighlighted = highlightedDomain === domain.code;

          return (
            <div key={domain.code}>
              {/* Domain row */}
              <button
                onClick={() => toggle(domain.code)}
                className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-brand-50/30 ${
                  isHighlighted ? "bg-brand-50/50" : ""
                }`}
              >
                {/* Expand icon */}
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center"
                >
                  <svg
                    className="h-3.5 w-3.5 text-surface-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.div>

                {/* Domain code badge */}
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                    isHighlighted
                      ? "bg-brand-500 text-white"
                      : "bg-surface-100 text-surface-600"
                  }`}
                >
                  {domain.code}
                </span>

                {/* Domain name */}
                <span
                  className={`flex-1 text-sm font-medium ${
                    isHighlighted ? "text-brand-900 font-semibold" : "text-surface-600"
                  }`}
                >
                  {domain.name}
                </span>

                {/* Category count */}
                <span className="text-[11px] text-surface-400">
                  {domain.categories.length} categories
                </span>

                {/* Highlighted indicator */}
                {isHighlighted && (
                  <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" />
                )}
              </button>

              {/* Categories */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-surface-100 bg-surface-50/30 px-5 py-2">
                      {domain.categories.map((cat) => {
                        const isCatHighlighted = highlightedCategory === cat.code;
                        return (
                          <div
                            key={cat.code}
                            className={`flex items-center gap-3 rounded-lg py-2 pl-8 transition-colors ${
                              isCatHighlighted ? "bg-saffron-500/8 -mx-2 px-10" : ""
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isCatHighlighted ? "bg-saffron-500" : "bg-surface-300"}`} />
                            <span className={`font-mono text-[10px] ${isCatHighlighted ? "font-semibold text-saffron-600" : "text-surface-400"}`}>
                              {cat.code}
                            </span>
                            <span className={`text-xs ${isCatHighlighted ? "font-semibold text-saffron-700" : "text-surface-600"}`}>
                              {cat.name}
                            </span>
                            {isCatHighlighted && (
                              <span className="ml-auto flex h-2 w-2 rounded-full bg-saffron-500 animate-pulse-dot" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
