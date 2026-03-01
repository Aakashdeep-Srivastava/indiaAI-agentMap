"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import VoiceInput from "@/components/VoiceInput";
import SathiAgent from "@/components/SathiAgent";

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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    udyam_number: "",
    name: "",
    description: "",
    state: "",
    district: "",
    pin_code: "",
    nic_code: "",
    language: "en",
    gender_owner: "",
    turnover_band: "",
    products: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const highlightTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleStepChange = useCallback((s: number) => {
    setStep(s);
  }, []);

  /* Magic-fill highlight: glow a field for 2 seconds */
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
      // Auto-advance to classify after 3 seconds
      setTimeout(() => {
        router.push(`/classify?mseId=${data.id}`);
      }, 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success !== null) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto w-full max-w-lg lg:w-[55%]"
          >
            <div className="glass-card overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-6 text-center text-white">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-bold">
                  Registration Successful
                </h3>
              </div>
              <div className="space-y-4 p-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-surface-50 px-5 py-3">
                  <span className="text-sm text-surface-500">Your MSE ID</span>
                  <span className="font-mono text-2xl font-bold text-brand-900">
                    {success}
                  </span>
                </div>
                <p className="text-sm text-surface-500">
                  Your business has been registered. Redirecting to classification...
                </p>
                <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a href={`/classify?mseId=${success}`} className="btn-primary inline-flex">
                    Continue to Classification
                    <svg className="ml-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Keep agent panel visible on success */}
          <div className="hidden lg:block lg:w-[45%] lg:sticky lg:top-6" style={{ height: "calc(100vh - 8rem)" }}>
            <SathiAgent
              form={form}
              onUpdate={update}
              onHighlight={handleHighlight}
              onSubmit={handleSubmit}
              onStepChange={handleStepChange}
              submitting={submitting}
              success={success}
            />
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    // Step 0: Identity
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h3 className="font-display text-lg font-bold text-brand-900">
          Business Identity
        </h3>
        <p className="mt-1 text-sm text-surface-500">
          Type or speak to Sathi — your fields will fill automatically.
        </p>
      </div>
      <Field
        label="Udyam Registration Number"
        placeholder="UDYAM-XX-00-0000001"
        value={form.udyam_number}
        onChange={(v) => update("udyam_number", v)}
        highlighted={highlighted.has("udyam_number")}
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="Business Name"
            placeholder="Your business or enterprise name"
            value={form.name}
            onChange={(v) => update("name", v)}
            highlighted={highlighted.has("name")}
          />
        </div>
        <VoiceInput
          language={form.language}
          fieldLabel="Business Name"
          onTranscribe={(text) => update("name", text)}
        />
      </div>
      <Field
        label="Preferred Language"
        value={form.language}
        onChange={(v) => update("language", v)}
        type="select"
        options={LANGUAGES}
        highlighted={highlighted.has("language")}
      />
    </motion.div>,

    // Step 1: Business + Location
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h3 className="font-display text-lg font-bold text-brand-900">
          Business Details
        </h3>
        <p className="mt-1 text-sm text-surface-500">
          Describe your products or services. Sathi will fill these as you speak.
        </p>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-500">
            Business Description
          </label>
          <textarea
            rows={4}
            placeholder="e.g. We make handloom cotton sarees and export across India..."
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={`input-field resize-none ${highlighted.has("description") ? "magic-fill" : ""}`}
          />
        </div>
        <div className="mt-6">
          <VoiceInput
            language={form.language}
            fieldLabel="Business Description"
            onTranscribe={(text) => update("description", text)}
          />
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-500">
            Products / Services
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Cotton sarees, Silk fabric, Dupattas"
            value={form.products}
            onChange={(e) => update("products", e.target.value)}
            className={`input-field resize-none ${highlighted.has("products") ? "magic-fill" : ""}`}
          />
          <p className="mt-1 text-[11px] text-surface-400">
            Comma-separated list of products or services you offer
          </p>
        </div>
        <div className="mt-6">
          <VoiceInput
            language={form.language}
            fieldLabel="Products"
            onTranscribe={(text) => update("products", text)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Owner Gender"
          value={form.gender_owner}
          onChange={(v) => update("gender_owner", v)}
          type="select"
          options={[
            ["male", "Male"],
            ["female", "Female"],
            ["other", "Other"],
          ]}
          highlighted={highlighted.has("gender_owner")}
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
      <Field
        label="State"
        value={form.state}
        onChange={(v) => update("state", v)}
        type="select"
        options={STATES.map((s) => [s, s])}
        highlighted={highlighted.has("state")}
      />
      <div className="grid grid-cols-2 gap-4">
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
    </motion.div>,
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: Form (55%) */}
        <div className="w-full space-y-6 lg:w-[55%]">
          {/* Step indicator */}
          <div className="flex items-center gap-3 px-1">
            {steps.map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold transition-all ${
                    i <= step
                      ? "bg-brand-500 text-white shadow-glow"
                      : "bg-surface-100 text-surface-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="h-0.5 flex-1 rounded-full bg-surface-100">
                    <div
                      className={`h-full rounded-full bg-brand-500 transition-all duration-500 ${
                        i < step ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="glass-card p-6">
            <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>

            {step < steps.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="btn-primary">
                Continue
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-saffron"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    Register MSE
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right: Sathi Agent Panel (45%) — desktop */}
        <div className="hidden lg:block lg:w-[45%] lg:sticky lg:top-6" style={{ height: "calc(100vh - 8rem)" }}>
          <SathiAgent
            form={form}
            onUpdate={update}
            onHighlight={handleHighlight}
            onSubmit={handleSubmit}
            onStepChange={handleStepChange}
            submitting={submitting}
            success={success}
          />
        </div>
      </div>

      {/* Mobile: Floating toggle button */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <button
          onClick={() => setAgentOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <AnimatePresence mode="wait">
            {agentOpen ? (
              <motion.svg
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </motion.svg>
            ) : (
              <motion.svg
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile: Bottom sheet agent panel */}
      <AnimatePresence>
        {agentOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
            style={{ height: "70vh" }}
          >
            <div className="h-full px-3 pb-3">
              <SathiAgent
                form={form}
                onUpdate={update}
                onHighlight={handleHighlight}
                onSubmit={handleSubmit}
                onStepChange={handleStepChange}
                submitting={submitting}
                success={success}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: backdrop when agent is open */}
      <AnimatePresence>
        {agentOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAgentOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-surface-500">
        {label}
        {highlighted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-saffron-500/10 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-saffron-500 animate-pulse">
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            </svg>
            Sathi
          </span>
        )}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field ${highlighted ? "magic-fill" : ""}`}
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
          className={`input-field ${highlighted ? "magic-fill" : ""}`}
        />
      )}
    </div>
  );
}
