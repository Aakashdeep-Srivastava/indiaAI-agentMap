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

const CATEGORY_PREVIEW_COUNT = 10;

export function TaxonomyBrowser({ domains, highlightedDomain, highlightedCategory }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const visible = q
    ? domains
        .map((d) => ({
          ...d,
          categories: d.categories.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q)
          ),
        }))
        .filter(
          (d) =>
            d.categories.length > 0 ||
            d.name.toLowerCase().includes(q) ||
            d.code.toLowerCase().includes(q)
        )
    : domains;

  return (
    <div className="glass-card overflow-hidden !p-0">
      {/* Header with search */}
      <div className="border-b border-surface-100 bg-surface-50/50 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 400+ categories…"
              aria-label="Search taxonomy categories"
              className="w-48 rounded-lg border border-surface-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-surface-600 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
        </div>
      </div>

      {/* Domain rows */}
      <div className="divide-y divide-surface-100">
        {visible.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-surface-400">
            No category matches &ldquo;{query}&rdquo; — try a simpler word.
          </p>
        )}
        {visible.map((domain) => {
          const isExpanded = q ? true : expanded.has(domain.code);
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
                    <div className="border-t border-surface-100 bg-surface-50/30 px-5 py-3">
                      {(() => {
                        const all = domain.categories;
                        const expandedAll = q !== "" || showAll.has(domain.code);
                        // Always keep the highlighted category visible.
                        let shown = expandedAll
                          ? all
                          : all.slice(0, CATEGORY_PREVIEW_COUNT);
                        if (
                          !expandedAll &&
                          highlightedCategory &&
                          !shown.some((c) => c.code === highlightedCategory)
                        ) {
                          const hl = all.find((c) => c.code === highlightedCategory);
                          if (hl) shown = [hl, ...shown.slice(0, CATEGORY_PREVIEW_COUNT - 1)];
                        }
                        return (
                          <>
                            <div className="grid gap-x-6 sm:grid-cols-2">
                              {shown.map((cat) => {
                                const isCatHighlighted = highlightedCategory === cat.code;
                                return (
                                  <div
                                    key={cat.code}
                                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                                      isCatHighlighted ? "bg-saffron-500/8" : ""
                                    }`}
                                  >
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCatHighlighted ? "bg-saffron-500" : "bg-surface-300"}`} />
                                    <span className={`truncate text-xs ${isCatHighlighted ? "font-semibold text-saffron-700" : "text-surface-600"}`}>
                                      {cat.name}
                                    </span>
                                    <span className={`ml-auto shrink-0 font-mono text-[10px] ${isCatHighlighted ? "font-semibold text-saffron-600" : "text-surface-400"}`}>
                                      {cat.code}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {!expandedAll && all.length > CATEGORY_PREVIEW_COUNT && (
                              <button
                                onClick={() =>
                                  setShowAll((prev) => new Set([...prev, domain.code]))
                                }
                                className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-500 transition-colors hover:bg-brand-50"
                              >
                                Show all {all.length} categories
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            )}
                          </>
                        );
                      })()}
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
