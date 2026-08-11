"use client";

/* Business picker — no numeric IDs anywhere.
 * - If the signed-in account has a linked enterprise, it auto-loads ("Your business").
 * - Otherwise, type-ahead search by business name or Udyam number. */

import { useEffect, useRef, useState } from "react";
import { useMSESearch, useMyMSE } from "@/lib/queries";

export interface PickedMSE {
  id: number;
  name: string;
  // Nullable on purpose: Udyam became optional at registration because PS2
  // reaches the informal long-tail, many of whom have no Udyam number yet.
  udyam_number?: string | null;
  district?: string | null;
  state?: string | null;
}

export default function MSEPicker({
  onSelect,
  autoRun = true,
}: {
  onSelect: (mse: PickedMSE) => void;
  autoRun?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [picked, setPicked] = useState<PickedMSE | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLoaded = useRef(false);

  /* The account's own enterprise, shared with the sidebar and the bell rather
   * than fetched again here — one /auth/me + /mse/{id} pair per page. */
  const { data: ownMSE } = useMyMSE();

  /* Search is keyed on the debounced query, so the cache holds one entry per
   * distinct search rather than one per keystroke, and revisiting a term is
   * instant instead of another round trip. */
  const { data: results = [], isFetching: searching } = useMSESearch(debouncedQuery);

  useEffect(() => {
    if (autoLoaded.current || !ownMSE) return;
    autoLoaded.current = true;
    const p: PickedMSE = {
      id: ownMSE.id,
      name: ownMSE.name,
      udyam_number: ownMSE.udyam_number ?? "",
      district: ownMSE.district,
      state: ownMSE.state,
    };
    setPicked(p);
    setIsOwn(true);
    if (autoRun) onSelect(p);
    // onSelect is a fresh closure on every parent render; depending on it here
    // would re-fire the auto-pick on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownMSE, autoRun]);

  function search(q: string) {
    setQuery(q);
    setOpen(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDebouncedQuery(q), 300);
  }

  function pick(m: PickedMSE) {
    setPicked(m);
    setIsOwn(false);
    setOpen(false);
    setQuery("");
    onSelect(m);
  }

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-3.5 py-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOwn ? "bg-saffron-500/10" : "bg-brand-50"}`}>
          <svg className={`h-4 w-4 ${isOwn ? "text-saffron-500" : "text-brand-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-900">{picked.name}</p>
          <p className="truncate font-mono text-[10px] text-surface-400">
            {isOwn ? "Your business · " : ""}{picked.udyam_number}
            {picked.district ? ` · ${picked.district}` : ""}
          </p>
        </div>
        <button
          onClick={() => { setPicked(null); setIsOwn(false); }}
          className="shrink-0 text-[11px] font-medium text-brand-500 hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search your business name or Udyam number…"
          className="input-field w-full pl-10"
        />
        {searching && (
          <div className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-surface-200 bg-white shadow-lg">
          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m)}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-brand-50/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-900">{m.name}</p>
                <p className="truncate font-mono text-[10px] text-surface-400">
                  {m.udyam_number}{m.district ? ` · ${m.district}, ${m.state ?? ""}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
