"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { API } from "@/lib/auth";

const PERSONAS = [
  ["mse", "MSE Owner · उद्यमी"],
  ["officer", "NSIC Officer · अधिकारी"],
  ["visitor", "Visitor · आगंतुक"],
] as const;

export default function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Please pick a star rating first. / कृपया पहले रेटिंग चुनें।");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          name: name.trim() || null,
          email: email.trim() || null,
          persona: persona || null,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.detail === "string" ? d.detail : "Could not submit — please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-brand-900">Thank you! · धन्यवाद!</h2>
        <p className="mt-2 text-sm text-surface-500">
          Your feedback helps us serve Bharat&apos;s businesses better. आपकी राय दर्ज हो गई है।
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 sm:p-8">
      {/* Star rating */}
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
        Your rating
      </label>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="rounded-lg p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${filled ? "fill-saffron-400 text-saffron-400" : "text-surface-300"}`}
              />
            </button>
          );
        })}
      </div>

      {/* Persona */}
      <label className="mb-1.5 mt-6 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
        You are a… <span className="font-normal normal-case text-surface-400">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {PERSONAS.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setPersona(persona === val ? "" : val)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              persona === val
                ? "border-brand-500 bg-brand-50 text-brand-900"
                : "border-surface-200 bg-white text-surface-500 hover:border-surface-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Comment */}
      <label className="mb-1.5 mt-6 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
        Your feedback
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="What worked well? What can we improve? / क्या अच्छा लगा, क्या बेहतर हो सकता है?"
        className="input-field w-full resize-none"
      />

      {/* Optional identity */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
            Name <span className="font-normal normal-case text-surface-400">(optional)</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
            Email <span className="font-normal normal-case text-surface-400">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            autoComplete="email"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary mt-6 flex w-full items-center justify-center gap-2 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-snug text-surface-400">
        We only use this to improve MSMEMate. Name and email are optional (DPDP-minimal).
      </p>
    </form>
  );
}
