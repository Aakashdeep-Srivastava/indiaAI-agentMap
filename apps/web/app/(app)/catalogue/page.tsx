"use client";

/* Catalogue Studio — download an ONDC-aligned template, upload the filled
 * sheet, get validation + auto-categorisation, and the Beckn catalog payload
 * ready for the matched seller platform. */

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/auth";

const MSEPicker = dynamic(() => import("@/components/MSEPicker"), { ssr: false });

const DOMAINS: { code: string; label: string; icon: string }[] = [
  { code: "RET10", label: "Grocery", icon: "🛒" },
  { code: "RET11", label: "Food & Beverage", icon: "🍱" },
  { code: "RET12", label: "Fashion", icon: "👗" },
  { code: "RET13", label: "Beauty & Care", icon: "🧴" },
  { code: "RET14", label: "Electronics", icon: "📱" },
  { code: "RET15", label: "Appliances", icon: "🔌" },
  { code: "RET16", label: "Home & Kitchen", icon: "🏠" },
  { code: "RET18", label: "Health & Wellness", icon: "🌿" },
];

interface CatalogueItem {
  row: number;
  product_name: string;
  price_inr: number | null;
  category_domain: string | null;
  issues: string[];
}

interface UploadResult {
  total_rows: number;
  valid_rows: number;
  items: CatalogueItem[];
  errors: string[];
  beckn_catalog: Record<string, unknown>;
  profile_enriched: boolean;
}

export default function CataloguePage() {
  const [mse, setMse] = useState<{ id: number; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate(domain: string) {
    setDownloading(domain);
    setError(null);
    try {
      const res = await apiFetch(`/catalogue/template/${domain}`, {}, 60000);
      if (!res.ok) throw new Error("Template download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MSMEMate_${domain}_catalogue_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  async function handleUpload(file: File) {
    if (!mse) {
      setError("Select your business first.");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("mse_id", String(mse.id));
      const res = await apiFetch(`/catalogue/upload`, { method: "POST", body: fd }, 120000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Upload failed");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function downloadBeckn() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.beckn_catalog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ondc_beckn_catalog.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-bold text-brand-900">Catalogue Studio</h2>
        <p className="mt-1 text-sm text-surface-500">
          Fill an ONDC-aligned template, upload it back, and get a validated,
          network-ready catalogue for your seller platform.
        </p>
      </div>

      {/* Step 1 — business */}
      <div className="glass-card p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          Step 1 · Your business
        </span>
        <div className="mt-2 max-w-xl">
          <MSEPicker autoRun onSelect={(m) => setMse({ id: m.id, name: m.name })} />
        </div>
      </div>

      {/* Step 2 — template */}
      <div className="glass-card p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          Step 2 · Download your category template
        </span>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DOMAINS.map((d) => (
            <button
              key={d.code}
              onClick={() => downloadTemplate(d.code)}
              disabled={downloading !== null}
              className="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-left transition-all hover:border-brand-300 hover:shadow-sm disabled:opacity-50"
            >
              <span className="text-lg">{d.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-brand-900">{d.label}</p>
                <p className="font-mono text-[10px] text-surface-400">
                  {downloading === d.code ? "Preparing…" : `${d.code} · .xlsx`}
                </p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-surface-400">
          Each template has 3 sheets — Instructions, Products (with the mandatory
          ONDC attributes for that category), and Reference values.
        </p>
      </div>

      {/* Step 3 — upload */}
      <div className="glass-card p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          Step 3 · Upload the filled sheet
        </span>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleUpload(f);
          }}
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-surface-300 bg-surface-50/50 px-6 py-8 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-xs font-medium text-surface-500">
                Validating & categorising your catalogue…
              </p>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium text-brand-900">
                Drop your filled template here, or click to browse
              </p>
              <p className="text-[11px] text-surface-400">.xlsx or .csv · up to 500 products</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Products found", value: result.total_rows },
              { label: "ONDC-ready", value: result.valid_rows },
              { label: "Need fixes", value: result.total_rows - result.valid_rows },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className="font-display text-2xl font-bold text-brand-900">{s.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-surface-400">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {result.profile_enriched && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium text-emerald-800">
                Your business profile has been enriched with these products —
                matching now uses your real catalogue.
              </p>
              <Link href="/match" className="btn-primary shrink-0 !px-4 !py-2 !text-xs">
                Re-run matching →
              </Link>
            </div>
          )}

          {/* Row detail */}
          <div className="glass-card overflow-hidden">
            <div className="border-b border-surface-100 px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                Validation & auto-categorisation
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {result.items.map((it) => (
                <div
                  key={it.row}
                  className="flex items-center gap-3 border-b border-surface-50 px-5 py-2.5"
                >
                  {it.issues.length === 0 ? (
                    <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 shrink-0 text-saffron-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-brand-900">
                      {it.product_name}
                    </p>
                    {it.issues.length > 0 && (
                      <p className="text-[10px] text-saffron-600">{it.issues.join(" · ")}</p>
                    )}
                  </div>
                  {it.category_domain && (
                    <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-600">
                      {it.category_domain}
                    </span>
                  )}
                  {it.price_inr != null && (
                    <span className="shrink-0 font-mono text-[11px] text-surface-500">
                      ₹{it.price_inr.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Beckn payload */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  ONDC Network Payload (Beckn catalog)
                </span>
                <p className="text-[10px] text-surface-400">
                  This is what your seller platform publishes to the network.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowJson(!showJson)} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
                  {showJson ? "Hide" : "View"} JSON
                </button>
                <button onClick={downloadBeckn} className="btn-primary !px-3 !py-1.5 !text-[11px]">
                  Download
                </button>
              </div>
            </div>
            {showJson && (
              <pre className="max-h-80 overflow-auto bg-brand-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                {JSON.stringify(result.beckn_catalog, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
