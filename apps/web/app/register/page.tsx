"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export default function RegisterPage() {
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    // Step 0: Basic info
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-semibold">Business Identity</h3>
      <p className="text-sm text-slate-500">
        Simulates voice-assisted onboarding — in production this would use
        Sarvam AI ASR for vernacular voice input.
      </p>
      <Field label="Udyam Registration Number" placeholder="UDYAM-XX-00-0000001" value={form.udyam_number} onChange={(v) => update("udyam_number", v)} />
      <Field label="Business Name" placeholder="Your business name" value={form.name} onChange={(v) => update("name", v)} />
      <Field label="Language" value={form.language} onChange={(v) => update("language", v)} type="select" options={[["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"], ["kn", "Kannada"]]} />
    </motion.div>,

    // Step 1: Description + Location
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-semibold">What does your business do?</h3>
      <p className="text-sm text-slate-500">
        Describe your products or services. Our AI will classify you into the
        right ONDC domain.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Business Description
        </label>
        <textarea
          rows={4}
          placeholder="e.g. We make handloom cotton sarees and export across India..."
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-ashoka-500 focus:outline-none focus:ring-2 focus:ring-ashoka-500/20"
        />
      </div>
      <Field label="State" value={form.state} onChange={(v) => update("state", v)} type="select" options={STATES.map((s) => [s, s])} />
      <Field label="District" placeholder="e.g. Varanasi" value={form.district} onChange={(v) => update("district", v)} />
      <Field label="PIN Code" placeholder="221001" value={form.pin_code} onChange={(v) => update("pin_code", v)} />
    </motion.div>,
  ];

  if (success !== null) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg space-y-4 rounded-xl bg-green-50 p-8 text-center"
      >
        <div className="text-4xl">&#10003;</div>
        <h3 className="text-xl font-bold text-green-800">
          MSE Registered Successfully
        </h3>
        <p className="text-sm text-green-700">
          Your MSE ID is <span className="font-mono font-bold">{success}</span>.
          You can now run classification and matching from the dashboard.
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-ashoka-500 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Go to Dashboard
        </a>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section className="rounded-xl bg-gradient-to-br from-saffron-600 to-saffron-500 p-6 text-white">
        <h2 className="text-xl font-bold">Register Your Business</h2>
        <p className="mt-1 text-sm text-orange-100">
          Voice-simulated MSE onboarding for ONDC
        </p>
      </section>

      {/* Step indicator */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-ashoka-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
        >
          Back
        </button>

        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-navy-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-ashoka-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? "Registering..." : "Register MSE"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Reusable field component ─────────────────────────────────────────

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  options,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "select";
  options?: string[][];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-ashoka-500 focus:outline-none focus:ring-2 focus:ring-ashoka-500/20"
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
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-ashoka-500 focus:outline-none focus:ring-2 focus:ring-ashoka-500/20"
        />
      )}
    </div>
  );
}
