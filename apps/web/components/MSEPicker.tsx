"use client";

/* Business picker — no numeric IDs anywhere.
 * - If the signed-in account has a linked enterprise, it auto-loads ("Your business").
 * - Otherwise, type-ahead search by business name or Udyam number. */

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth";

export interface PickedMSE {
  id: number;
  name: string;
  udyam_number: string;
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
  const [results, setResults] = useState<PickedMSE[]>([]);
  const [picked, setPicked] = useState<PickedMSE | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLoaded = useRef(false);

  /* Auto-load the account's linked enterprise */
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    (async () => {
      try {
        const me = await apiFetch(`/auth/me`).then((r) => (r.ok ? r.json() : null));
        if (!me?.mse_id) return;
        const mse = await apiFetch(`/mse/${me.mse_id}`).then((r) => (r.ok ? r.json() : null));
        if (mse) {
          const p: PickedMSE = {
            id: mse.id, name: mse.name, udyam_number: mse.udyam_number,
            district: mse.district, state: mse.state,
          };
          setPicked(p);
          setIsOwn(true);
          if (autoRun) onSelect(p);
        }
      } catch {
        /* picker degrades to search-only */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search(q: string) {
    setQuery(q);
    setOpen(true);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await apiFetch(`/mse/search?q=${encodeURIComponent(q.trim())}`);
        if (r.ok) setResults(await r.json());
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
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
