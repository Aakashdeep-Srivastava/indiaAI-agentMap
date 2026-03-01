"use client";

import { useState, useRef, useCallback } from "react";

/* ── Mock taxonomy data shown after "upload" ─────────────────────── */
const MOCK_TAXONOMY = [
  { domain: "RET10", category: "Grocery", subcategory: "Fruits & Vegetables", code: "RET10-1001", keywords: "sabzi, phal, tarkari, fruits, vegetables" },
  { domain: "RET10", category: "Grocery", subcategory: "Staples & Grains", code: "RET10-1002", keywords: "chawal, atta, rice, wheat, dal" },
  { domain: "RET10", category: "Grocery", subcategory: "Spices & Masala", code: "RET10-1003", keywords: "mirch, haldi, jeera, masala, spices" },
  { domain: "RET10", category: "Grocery", subcategory: "Dairy & Bakery", code: "RET10-1004", keywords: "doodh, paneer, bread, milk, curd" },
  { domain: "RET10", category: "Grocery", subcategory: "Packaged Foods", code: "RET10-1005", keywords: "biscuit, namkeen, chips, snacks, noodles" },
  { domain: "RET12", category: "Fashion", subcategory: "Men's Clothing", code: "RET12-2001", keywords: "shirt, kurta, trousers, jeans, men" },
  { domain: "RET12", category: "Fashion", subcategory: "Women's Clothing", code: "RET12-2002", keywords: "saree, suit, kurti, lehenga, dress" },
  { domain: "RET12", category: "Fashion", subcategory: "Footwear", code: "RET12-2003", keywords: "chappal, joota, sandal, shoes, slippers" },
  { domain: "RET12", category: "Fashion", subcategory: "Textiles & Fabrics", code: "RET12-2004", keywords: "kapda, silk, cotton, handloom, fabric" },
  { domain: "RET14", category: "Electronics", subcategory: "Mobile & Accessories", code: "RET14-3001", keywords: "phone, mobile, charger, earphone, cover" },
  { domain: "RET14", category: "Electronics", subcategory: "Home Appliances", code: "RET14-3002", keywords: "mixer, fan, cooler, iron, appliance" },
  { domain: "RET14", category: "Electronics", subcategory: "Computer & IT", code: "RET14-3003", keywords: "laptop, computer, printer, keyboard, mouse" },
  { domain: "RET16", category: "Home & Kitchen", subcategory: "Kitchen Utensils", code: "RET16-4001", keywords: "bartan, tawa, kadhai, utensils, cookware" },
  { domain: "RET16", category: "Home & Kitchen", subcategory: "Furniture", code: "RET16-4002", keywords: "table, chair, bed, sofa, almirah" },
  { domain: "RET16", category: "Home & Kitchen", subcategory: "Home Décor", code: "RET16-4003", keywords: "painting, curtain, lamp, decor, carpet" },
  { domain: "RET18", category: "Health & Wellness", subcategory: "Ayurveda & Herbal", code: "RET18-5001", keywords: "ayurveda, tulsi, neem, herbal, desi dawa" },
  { domain: "RET18", category: "Health & Wellness", subcategory: "Personal Care", code: "RET18-5002", keywords: "soap, shampoo, cream, oil, skincare" },
  { domain: "RET18", category: "Health & Wellness", subcategory: "Nutrition & Supplements", code: "RET18-5003", keywords: "protein, vitamin, supplement, health, nutrition" },
];

const DOMAIN_COLORS: Record<string, string> = {
  RET10: "bg-emerald-50 text-emerald-700",
  RET12: "bg-pink-50 text-pink-700",
  RET14: "bg-blue-50 text-blue-700",
  RET16: "bg-amber-50 text-amber-700",
  RET18: "bg-purple-50 text-purple-700",
};

type UploadState = "idle" | "preview" | "importing" | "done";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setState("preview");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleImport = useCallback(() => {
    setState("importing");
    setTimeout(() => setState("done"), 2200);
  }, []);

  const handleReset = useCallback(() => {
    setState("idle");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const domains = [...new Set(MOCK_TAXONOMY.map((r) => r.domain))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
            <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
            Data Ingestion
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold text-brand-900">
          Upload Product Taxonomy
        </h2>
        <p className="mt-1 text-sm text-surface-500">
          Import ONDC domain taxonomy from Excel (.xlsx) or CSV. This data feeds
          into VargBot for MSE classification.
        </p>
      </div>

      {/* Upload zone */}
      {state === "idle" && (
        <div
          className={`glass-card flex flex-col items-center justify-center border-2 border-dashed py-16 transition-all ${
            dragOver
              ? "border-brand-500 bg-brand-50/30"
              : "border-surface-200 hover:border-brand-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-7 w-7 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="font-display text-base font-semibold text-brand-900">
            Drag & drop your taxonomy file
          </p>
          <p className="mt-1 text-sm text-surface-400">
            Supports .xlsx, .xls, .csv
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="btn-primary mt-5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Browse Files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileSelect}
          />
          <div className="mt-6 flex items-center gap-4 text-[11px] text-surface-400">
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Data stays in Indian servers
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              DPDP Act compliant
            </span>
          </div>
        </div>
      )}

      {/* Preview state */}
      {(state === "preview" || state === "importing") && (
        <>
          {/* File info bar */}
          <div className="glass-card flex items-center justify-between !py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-brand-900">
                  {fileName}
                </p>
                <p className="text-xs text-surface-400">
                  {MOCK_TAXONOMY.length} rows &middot; {domains.length} domains &middot; Ready to import
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReset} className="btn-secondary !py-2 !text-xs">
                Change File
              </button>
              <button
                onClick={handleImport}
                disabled={state === "importing"}
                className="btn-saffron !py-2 !text-xs"
              >
                {state === "importing" ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Import to Database
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {domains.map((d) => {
              const count = MOCK_TAXONOMY.filter((r) => r.domain === d).length;
              return (
                <div key={d} className="glass-card !py-3 text-center">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${DOMAIN_COLORS[d] ?? "bg-surface-50 text-surface-600"}`}>
                    {d}
                  </span>
                  <p className="mt-1 font-display text-lg font-bold text-brand-900">{count}</p>
                  <p className="text-[10px] text-surface-400">categories</p>
                </div>
              );
            })}
          </div>

          {/* Preview table */}
          <div className="glass-card overflow-hidden !rounded-2xl !p-0">
            <div className="border-b border-surface-100 bg-surface-50/50 px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-brand-900">
                Data Preview
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      Domain
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      Category
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      Subcategory
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      Code
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                      Keywords (EN/HI)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {MOCK_TAXONOMY.map((row, i) => (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-brand-50/30"
                    >
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${DOMAIN_COLORS[row.domain] ?? "bg-surface-50 text-surface-600"}`}>
                          {row.domain}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-brand-900">
                        {row.category}
                      </td>
                      <td className="px-5 py-3 text-sm text-surface-600">
                        {row.subcategory}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-surface-500">
                        {row.code}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-xs text-surface-400">
                        {row.keywords}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Success state */}
      {state === "done" && (
        <div className="glass-card overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-6 text-center text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold">
              Taxonomy Imported Successfully
            </h3>
          </div>
          <div className="space-y-4 p-8 text-center">
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="font-display text-3xl font-bold text-brand-900">
                  {MOCK_TAXONOMY.length}
                </p>
                <p className="text-xs text-surface-400">Categories added</p>
              </div>
              <div className="h-10 w-px bg-surface-200" />
              <div>
                <p className="font-display text-3xl font-bold text-brand-900">
                  {domains.length}
                </p>
                <p className="text-xs text-surface-400">ONDC Domains</p>
              </div>
              <div className="h-10 w-px bg-surface-200" />
              <div>
                <p className="font-display text-3xl font-bold text-emerald-600">
                  Active
                </p>
                <p className="text-xs text-surface-400">VargBot status</p>
              </div>
            </div>
            <p className="text-sm text-surface-500">
              The taxonomy is now available for VargBot classification. MSEs will be matched against these {MOCK_TAXONOMY.length} categories across {domains.length} ONDC retail domains.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={handleReset} className="btn-secondary">
                Upload Another
              </button>
              <a href="/classify" className="btn-primary">
                Test Classification
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
