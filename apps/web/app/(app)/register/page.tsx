"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const SathiVoicePanel = dynamic(
  () => import("@/components/sathi/SathiVoicePanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-brand-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-saffron-400 border-t-transparent" />
      </div>
    ),
  }
);

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

const LANGUAGES = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["kn", "Kannada"],
  ["bn", "Bengali"],
  ["mr", "Marathi"],
  ["gu", "Gujarati"],
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    udyam_number: "",
    mobile_number: "",
    name: "",
    description: "",
    state: "",
    district: "",
    pin_code: "",
    nic_code: "",
    language: "en",
    turnover_band: "",
    products: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const highlightTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleHighlight = useCallback((fields: string[]) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      for (const f of fields) next.add(f);
      return next;
    });
    for (const f of fields) {
      if (highlightTimers.current[f]) clearTimeout(highlightTimers.current[f]);
      highlightTimers.current[f] = setTimeout(() => {
        setHighlighted((prev) => {
          const next = new Set(prev);
          next.delete(f);
          return next;
        });
      }, 2500);
    }
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/mse/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Registration failed");
      }
      const data = await res.json();
      setSuccess(data.id);
      setTimeout(() => {
        router.push(`/classify?mseId=${data.id}`);
      }, 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Success state ─── */
  if (success !== null) {
    return (
      <div className="-mx-6 -my-8 flex h-screen overflow-hidden">
        {/* Center */}
        <div className="flex-1 overflow-hidden">
          <SathiVoicePanel
            form={form}
            onUpdate={update}
            onHighlight={handleHighlight}
            onSubmit={handleSubmit}
            submitting={submitting}
            success={success}
          />
        </div>

        {/* Right panel — success card */}
        <div className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-surface-100 bg-white px-5 py-4 lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="overflow-hidden rounded-2xl border border-surface-200">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-6 text-center text-white">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-bold">Registration Successful</h3>
              </div>
              <div className="space-y-4 p-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-surface-50 px-5 py-3">
                  <span className="text-sm text-surface-500">Your MSE ID</span>
                  <span className="font-mono text-2xl font-bold text-brand-900">{success}</span>
                </div>
                <p className="text-sm text-surface-500">
                  Redirecting to classification...
                </p>
                <Link href={`/classify?mseId=${success}`} className="btn-primary inline-flex">
                  Continue to Classification
                  <svg className="ml-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ─── Form panel content ─── */
  const formContent = (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-bold text-brand-900">
          Registration Details
        </h3>
        <p className="mt-1 text-xs text-surface-500">
          Sathi fills these as you speak. You can also edit directly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Udyam Number"
          placeholder="UDYAM-XX-00-0000001"
          value={form.udyam_number}
          onChange={(v) => update("udyam_number", v)}
          highlighted={highlighted.has("udyam_number")}
        />
        <Field
          label="Mobile Number"
          placeholder="9876543210"
          value={form.mobile_number}
          onChange={(v) => update("mobile_number", v)}
          highlighted={highlighted.has("mobile_number")}
        />
      </div>

      <Field
        label="Business Name"
        placeholder="Your business or enterprise name"
        value={form.name}
        onChange={(v) => update("name", v)}
        highlighted={highlighted.has("name")}
      />

      <div>
        <label className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
          Products / Services
          {highlighted.has("products") && <SathiBadge />}
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Cotton sarees, Silk fabric, Dupattas"
          value={form.products}
          onChange={(e) => update("products", e.target.value)}
          className={`input-field resize-none !py-2.5 text-sm ${highlighted.has("products") ? "magic-fill" : ""}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field
          label="State"
          value={form.state}
          onChange={(v) => update("state", v)}
          type="select"
          options={STATES.map((s) => [s, s])}
          highlighted={highlighted.has("state")}
        />
        <Field
          label="District"
          placeholder="e.g. Varanasi"
          value={form.district}
          onChange={(v) => update("district", v)}
          highlighted={highlighted.has("district")}
        />
        <Field
          label="PIN Code"
          placeholder="221001"
          value={form.pin_code}
          onChange={(v) => update("pin_code", v)}
          highlighted={highlighted.has("pin_code")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Language"
          value={form.language}
          onChange={(v) => update("language", v)}
          type="select"
          options={LANGUAGES}
          highlighted={highlighted.has("language")}
        />
        <Field
          label="Enterprise Size"
          value={form.turnover_band}
          onChange={(v) => update("turnover_band", v)}
          type="select"
          options={[
            ["micro", "Micro"],
            ["small", "Small"],
            ["medium", "Medium"],
          ]}
          highlighted={highlighted.has("turnover_band")}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !form.name || !form.udyam_number}
        className="btn-saffron w-full !py-2.5 !text-xs"
      >
        {submitting ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Registering...
          </>
        ) : (
          <>
            Register MSE
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* ─── Desktop: White center + right form panel, no scroll ─── */}
      <div className="-mx-6 -my-8 hidden h-screen overflow-hidden lg:flex">
        {/* Center: Sathi voice area — white, fills space */}
        <div className="flex-1 overflow-hidden">
          <SathiVoicePanel
            form={form}
            onUpdate={update}
            onHighlight={handleHighlight}
            onSubmit={handleSubmit}
            submitting={submitting}
            success={success}
          />
        </div>

        {/* Right: Form panel — visually connected, no left border */}
        <div className="w-[360px] shrink-0 overflow-y-auto border-l border-surface-100 bg-white px-5 py-4">
          {formContent}
        </div>
      </div>

      {/* ─── Mobile: stacked ─── */}
      <div className="lg:hidden space-y-4">
        <div style={{ height: "55vh" }}>
          <SathiVoicePanel
            form={form}
            onUpdate={update}
            onHighlight={handleHighlight}
            onSubmit={handleSubmit}
            submitting={submitting}
            success={success}
          />
        </div>
        <div className="glass-card p-5">{formContent}</div>
      </div>
    </>
  );
}

/* ─── "Filled by Sathi" badge ─── */
function SathiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-saffron-500/10 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-saffron-500 animate-pulse">
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Sathi
    </span>
  );
}

/* ─── Form field component ─── */
function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  options,
  highlighted = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "select";
  options?: string[][];
  highlighted?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
        {label}
        {highlighted && <SathiBadge />}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field !py-2.5 text-sm ${highlighted ? "magic-fill" : ""}`}
        >
          <option value="">Select...</option>
          {options?.map(([val, display]) => (
            <option key={val} value={val}>
              {display}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field !py-2.5 text-sm ${highlighted ? "magic-fill" : ""}`}
        />
      )}
    </div>
  );
}
