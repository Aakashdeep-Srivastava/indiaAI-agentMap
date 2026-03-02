"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const DomainPredictionCard = dynamic(
  () =>
    import("@/components/DomainPredictionCard").then((m) => ({
      default: m.DomainPredictionCard,
    })),
  { ssr: false }
);
const TaxonomyBrowser = dynamic(
  () =>
    import("@/components/TaxonomyBrowser").then((m) => ({
      default: m.TaxonomyBrowser,
    })),
  { ssr: false }
);
const ClassificationHistory = dynamic(
  () =>
    import("@/components/ClassificationHistory").then((m) => ({
      default: m.ClassificationHistory,
    })),
  { ssr: false }
);
const VoiceInput = dynamic(() => import("@/components/VoiceInput"), {
  ssr: false,
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Constants ───────────────────────────────────────────────────── */

const DOMAIN_NAMES: Record<string, string> = {
  RET10: "Grocery",
  RET12: "Fashion",
  RET14: "Electronics",
  RET16: "Home & Kitchen",
  RET18: "Health & Wellness",
};

const DOMAIN_ICONS: Record<string, string> = {
  RET10: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z",
  RET12: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  RET14: "M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  RET16: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
  RET18: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
};

const DOMAIN_EXPLAINERS: Record<string, { en: string; hi: string }> = {
  RET10: {
    en: "This business has been classified under the Grocery domain (RET10). The description indicates involvement in food items, daily essentials, spices, or provisions — typical of kirana stores and grocery retailers on ONDC.",
    hi: "इस व्यवसाय को किराना (RET10) श्रेणी में वर्गीकृत किया गया है। विवरण से पता चलता है कि यह खाद्य पदार्थ, दैनिक आवश्यकताएं, मसाले या प्रावधान — ONDC पर किराना स्टोर और किराना खुदरा विक्रेताओं का व्यवसाय है।",
  },
  RET12: {
    en: "This business has been classified under the Fashion domain (RET12). The description suggests involvement in textiles, garments, weaving, or apparel — matching the clothing and fashion category on ONDC.",
    hi: "इस व्यवसाय को फैशन (RET12) श्रेणी में वर्गीकृत किया गया है। विवरण बताता है कि यह कपड़ा, वस्त्र, बुनाई या परिधान — ONDC पर कपड़े और फैशन श्रेणी से मेल खाता है।",
  },
  RET14: {
    en: "This business has been classified under the Electronics domain (RET14). The description indicates involvement in electronic devices, mobile phones, appliances, or electrical products sold through ONDC.",
    hi: "इस व्यवसाय को इलेक्ट्रॉनिक्स (RET14) श्रेणी में वर्गीकृत किया गया है। विवरण से पता चलता है कि यह इलेक्ट्रॉनिक उपकरण, मोबाइल फोन, उपकरण, या ONDC पर बिकने वाले विद्युत उत्पादों से संबंधित है।",
  },
  RET16: {
    en: "This business has been classified under the Home & Kitchen domain (RET16). The description suggests involvement in furniture, kitchenware, home décor, handicrafts, or household items on ONDC.",
    hi: "इस व्यवसाय को घर और रसोई (RET16) श्रेणी में वर्गीकृत किया गया है। विवरण बताता है कि यह फर्नीचर, रसोई का सामान, सजावट, हस्तशिल्प, या ONDC पर घरेलू सामान से संबंधित है।",
  },
  RET18: {
    en: "This business has been classified under the Health & Wellness domain (RET18). The description indicates involvement in ayurvedic products, herbal remedies, health supplements, or wellness items on ONDC.",
    hi: "इस व्यवसाय को स्वास्थ्य और कल्याण (RET18) श्रेणी में वर्गीकृत किया गया है। विवरण बताता है कि यह आयुर्वेदिक उत्पाद, हर्बल उपचार, स्वास्थ्य पूरक, या ONDC पर कल्याण आइटम से संबंधित है।",
  },
};

const ENGINE_META: Record<
  string,
  { label: string; desc: string; classes: string }
> = {
  "gemini-llm": {
    label: "Gemini LLM",
    desc: "Google Gemini multimodal",
    classes: "bg-sky-50 text-sky-700 border-sky-200",
  },
  "nvidia-qwen": {
    label: "Qwen 3.5 397B",
    desc: "NVIDIA NIM inference",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "sarvam-llm": {
    label: "Sarvam-m",
    desc: "Sovereign Indian LLM",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "muril-lora": {
    label: "MuRIL LoRA",
    desc: "Fine-tuned classifier",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
  "keyword-fallback": {
    label: "Keyword Match",
    desc: "Deterministic fallback",
    classes: "bg-surface-50 text-surface-600 border-surface-200",
  },
};

const PIPELINE_ENGINES = ["Gemini", "NVIDIA", "Sarvam", "MuRIL", "Keywords"];

/* ─── Types ───────────────────────────────────────────────────────── */

interface PredictionItem {
  domain: string;
  confidence: number;
  category?: string;
  category_name?: string;
  explanation?: string;
}

interface ClassifyResult {
  mse_id: number;
  top3: PredictionItem[];
  selected_domain: string;
  confidence: number;
  selected_category?: string;
  selected_category_name?: string;
  explanation?: string;
  engine?: string;
}

interface MSEInfo {
  id: number;
  name: string;
  udyam_number: string;
  state: string | null;
  description: string;
}

interface DomainData {
  id: number;
  code: string;
  name: string;
  description: string | null;
  categories: { id: number; code: string; name: string }[];
}

interface HistoryItem {
  id: number;
  predicted_domain: string;
  confidence: number;
  model_version: string | null;
  created_at: string;
}

type TabMode = "mse" | "text";

/* ─── Inline Components ───────────────────────────────────────────── */

function ConfidenceRing({
  score,
  size = 108,
}: {
  score: number;
  size?: number;
}) {
  const sw = 7;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c - score * c;
  const bandColor =
    score >= 0.85 ? "#10b981" : score >= 0.6 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={sw}
          className="stroke-surface-100"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#cring)`}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
        <defs>
          <linearGradient id="cring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B4FCC" />
            <stop offset="100%" stopColor={bandColor} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.35, type: "spring" }}
          className="font-display text-2xl font-extrabold text-brand-900"
        >
          {(score * 100).toFixed(0)}
          <span className="text-sm font-bold text-surface-400">%</span>
        </motion.span>
      </div>
    </div>
  );
}

function ConfidenceDistribution({
  predictions,
}: {
  predictions: PredictionItem[];
}) {
  const colors = ["#E8680C", "#1B4FCC", "#CBD5E1"];
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-100">
        {predictions.map((p, i) => (
          <motion.div
            key={p.domain}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(p.confidence * 100, 0.5)}%` }}
            transition={{
              duration: 0.8,
              delay: 0.6 + i * 0.15,
              ease: "easeOut",
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: colors[i] }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {predictions.map((p, i) => (
          <div key={p.domain} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
            <span className="text-[10px] font-medium text-surface-500">
              {DOMAIN_NAMES[p.domain]} {(p.confidence * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function ClassifyPage() {
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);

  const [tab, setTab] = useState<TabMode>("text");
  const [mseId, setMseId] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");

  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [mseInfo, setMseInfo] = useState<MSEInfo | null>(null);
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainerLang, setExplainerLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    const paramId = searchParams.get("mseId");
    if (paramId && !autoTriggered.current) {
      autoTriggered.current = true;
      setMseId(paramId);
      setTab("mse");
    }
  }, [searchParams]);

  useEffect(() => {
    fetch(`${API}/domains/`)
      .then((r) => r.json())
      .then(setDomains)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (autoTriggered.current && mseId && !result && !loading) {
      classifyByMSE();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mseId]);

  const classifyByMSE = async () => {
    if (!mseId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMseInfo(null);
    setHistory([]);
    try {
      const mseRes = await fetch(`${API}/mse/${mseId}`);
      if (!mseRes.ok) throw new Error("MSE not found");
      const mse: MSEInfo = await mseRes.json();
      setMseInfo(mse);
      const classifyRes = await fetch(`${API}/classify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mse_id: parseInt(mseId) }),
      });
      if (!classifyRes.ok) throw new Error("Classification failed");
      setResult(await classifyRes.json());
      const histRes = await fetch(`${API}/classify/history/${mseId}`);
      if (histRes.ok) setHistory(await histRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const classifyByText = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMseInfo(null);
    setHistory([]);
    try {
      const res = await fetch(`${API}/classify/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, language }),
      });
      if (!res.ok) throw new Error("Classification failed");
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = () =>
    tab === "mse" ? classifyByMSE() : classifyByText();

  const engineInfo = result?.engine
    ? ENGINE_META[result.engine] ?? null
    : null;
  const topIcon = result
    ? DOMAIN_ICONS[result.selected_domain] ?? DOMAIN_ICONS.RET10
    : "";

  return (
    <div className="space-y-8">
      {/* ═══ Page Header ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 shadow-lg shadow-brand-900/20">
            <svg
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-900">
              VargBot
            </h1>
            <p className="text-sm text-surface-500">
              ONDC Taxonomy Classification Engine
            </p>
          </div>
        </div>
        <span className="hidden rounded-lg border border-surface-200 bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-surface-400 sm:inline-block">
          Module 2
        </span>
      </motion.div>

      {/* ═══ Input Card ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card overflow-hidden"
      >
        {/* Tab switcher */}
        <div className="flex border-b border-surface-100">
          {(
            [
              {
                key: "text" as TabMode,
                label: "By Description",
                icon: "M4 6h16M4 12h16M4 18h7",
              },
              {
                key: "mse" as TabMode,
                label: "By MSE ID",
                icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium transition-all ${
                tab === t.key
                  ? "border-b-2 border-brand-500 bg-brand-50/30 text-brand-900"
                  : "text-surface-400 hover:bg-surface-50 hover:text-surface-600"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {tab === "mse" ? (
              <motion.div
                key="mse"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    MSE ID
                  </label>
                  <input
                    type="number"
                    value={mseId}
                    onChange={(e) => setMseId(e.target.value)}
                    placeholder="Enter MSE ID (e.g. 1, 2, 3...)"
                    className="input-field"
                    min={1}
                    onKeyDown={(e) => e.key === "Enter" && handleClassify()}
                  />
                </div>
                <button
                  onClick={handleClassify}
                  disabled={loading || !mseId.trim()}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  )}
                  {loading ? "Classifying..." : "Classify MSE"}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="hi-en">Hindi-English (Code-mixed)</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="bn">Bengali</option>
                    <option value="mr">Marathi</option>
                    <option value="gu">Gujarati</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    Business Description
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the MSE's business... (e.g. 'We sell rice, dal, spices, and grocery items to local customers')"
                      className="input-field min-h-[100px] resize-y"
                      rows={4}
                    />
                    <div className="flex flex-col justify-end pb-1">
                      <VoiceInput
                        language={language}
                        fieldLabel="Business Description"
                        onTranscribe={(text) =>
                          setDescription((prev) =>
                            prev ? prev + " " + text : text
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClassify}
                  disabled={loading || !description.trim()}
                  className="btn-saffron w-full"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  )}
                  {loading ? "Classifying..." : "Classify Description"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══ Error ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Empty State ══════════════════════════════════════════════ */}
      {!result && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card py-16 text-center"
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500/10 to-saffron-500/10">
            <svg
              className="h-9 w-9 text-brand-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-bold text-brand-900">
            Ready to Classify
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-surface-500">
            Enter a business description or MSE ID above. VargBot will classify
            it into the appropriate ONDC retail domain and subcategory using
            AI-powered analysis.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2">
            {Object.entries(DOMAIN_NAMES).map(([code, name]) => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1 text-[11px] font-medium text-surface-500"
              >
                <svg
                  className="h-3 w-3 text-surface-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={DOMAIN_ICONS[code]} />
                </svg>
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ Loading State ════════════════════════════════════════════ */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card py-14"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-900">
                <svg
                  className="h-8 w-8 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <motion.div
                className="absolute -inset-3 rounded-3xl border-2 border-brand-500/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="text-center">
              <h3 className="font-display text-lg font-bold text-brand-900">
                VargBot is classifying...
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Analyzing against ONDC taxonomy
              </p>
            </div>
            <div className="flex items-center gap-2">
              {PIPELINE_ENGINES.map((name, i) => (
                <motion.div
                  key={name}
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: i * 0.35,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="text-[10px] font-medium text-surface-400">
                    {name}
                  </span>
                  {i < PIPELINE_ENGINES.length - 1 && (
                    <svg
                      className="mx-0.5 h-2.5 w-2.5 text-surface-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ Results ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* MSE info bar */}
            {mseInfo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card !rounded-xl px-5 py-3.5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                    <svg
                      className="h-4 w-4 text-brand-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-brand-900">
                      {mseInfo.name}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-surface-300" />
                    <span className="font-mono text-[11px] text-surface-500">
                      {mseInfo.udyam_number}
                    </span>
                    {mseInfo.state && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-surface-300" />
                        <span className="text-xs text-surface-500">
                          {mseInfo.state}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {mseInfo.description && (
                  <p className="mt-2 truncate pl-11 text-xs italic text-surface-400">
                    &ldquo;{mseInfo.description}&rdquo;
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Result Hero Card ──────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              {/* Saffron accent top border */}
              <div className="h-1 bg-gradient-to-r from-brand-500 via-saffron-500 to-saffron-400" />

              <div className="p-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  {/* Confidence Ring */}
                  <ConfidenceRing score={result.confidence} />

                  {/* Result info */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col items-center gap-2 sm:flex-row">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={topIcon} />
                        </svg>
                      </div>
                      <div>
                        <span className="block font-mono text-[10px] uppercase tracking-widest text-surface-400">
                          {result.selected_domain}
                        </span>
                        <h2 className="font-display text-xl font-extrabold text-brand-900">
                          {DOMAIN_NAMES[result.selected_domain] ??
                            result.selected_domain}
                        </h2>
                      </div>
                    </div>

                    {/* Category + Engine pills */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {result.selected_category_name && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron-500/20 bg-saffron-500/5 px-3 py-1 text-[11px] font-semibold text-saffron-600">
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                          </svg>
                          {result.selected_category_name}
                        </span>
                      )}
                      {engineInfo && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${engineInfo.classes}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          {engineInfo.label}
                        </span>
                      )}
                    </div>

                    {/* Confidence distribution */}
                    <div className="mt-4">
                      <ConfidenceDistribution predictions={result.top3} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Top-3 Predictions ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-brand-900">
                <svg
                  className="h-5 w-5 text-saffron-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Top-3 Domain Predictions
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.top3.map((pred, i) => (
                  <div key={pred.domain} className="space-y-2">
                    <DomainPredictionCard
                      domain={pred.domain}
                      domainName={DOMAIN_NAMES[pred.domain] ?? pred.domain}
                      confidence={pred.confidence}
                      rank={i + 1}
                      isSelected={i === 0}
                    />
                    {pred.category_name && (
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/15 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold text-brand-500">
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                          </svg>
                          {pred.category_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── AI Reasoning ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card overflow-hidden"
            >
              <div className="border-b border-surface-100 bg-surface-50/40 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                      AI Reasoning
                    </span>
                    {engineInfo && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${engineInfo.classes}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                        via {engineInfo.label}
                      </span>
                    )}
                  </div>
                  {/* EN / HI toggle — only if using fallback templates */}
                  {!result.explanation && (
                    <div className="flex overflow-hidden rounded-lg border border-surface-200 bg-white">
                      <button
                        onClick={() => setExplainerLang("en")}
                        className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          explainerLang === "en"
                            ? "bg-brand-500 text-white"
                            : "text-surface-500 hover:text-brand-900"
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setExplainerLang("hi")}
                        className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          explainerLang === "hi"
                            ? "bg-brand-500 text-white"
                            : "text-surface-500 hover:text-brand-900"
                        }`}
                      >
                        HI
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-surface-600">
                  {result.explanation ??
                    DOMAIN_EXPLAINERS[result.selected_domain]?.[
                      explainerLang
                    ] ??
                    `Classified under ${
                      DOMAIN_NAMES[result.selected_domain] ??
                      result.selected_domain
                    }.`}
                </p>

                {/* Category detail row */}
                {result.selected_category_name && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/50 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-500/10">
                      <svg
                        className="h-4 w-4 text-saffron-500"
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
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                        Subcategory
                      </span>
                      <p className="text-sm font-semibold text-brand-900">
                        {result.selected_category_name}
                        {result.selected_category && (
                          <span className="ml-2 font-mono text-[11px] font-normal text-surface-400">
                            {result.selected_category}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-prediction explanations */}
                {result.top3.some((p) => p.explanation) && (
                  <div className="mt-4 space-y-2 border-t border-surface-100 pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                      Per-Prediction Reasoning
                    </span>
                    {result.top3.map(
                      (pred, i) =>
                        pred.explanation && (
                          <div
                            key={pred.domain}
                            className="flex items-start gap-2"
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${
                                i === 0
                                  ? "bg-saffron-500"
                                  : i === 1
                                    ? "bg-brand-500"
                                    : "bg-surface-400"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <p className="text-xs leading-relaxed text-surface-500">
                              <span className="font-semibold text-surface-600">
                                {DOMAIN_NAMES[pred.domain]}:
                              </span>{" "}
                              {pred.explanation}
                            </p>
                          </div>
                        )
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── ONDC Taxonomy ─────────────────────────────────────── */}
            {domains.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-brand-900">
                  <svg
                    className="h-5 w-5 text-brand-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  ONDC Taxonomy
                </h3>
                <TaxonomyBrowser
                  domains={domains}
                  highlightedDomain={result.selected_domain}
                  highlightedCategory={result.selected_category}
                />
              </motion.div>
            )}

            {/* ── History (MSE mode) ───────────────────────────────── */}
            {tab === "mse" && mseInfo && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-brand-900">
                  <svg
                    className="h-5 w-5 text-surface-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Classification History
                </h3>
                <ClassificationHistory mseId={mseInfo.id} history={history} />
              </motion.div>
            )}

            {/* ── Continue to Matching CTA ──────────────────────────── */}
            {tab === "mse" && mseId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex justify-center pt-2"
              >
                <a
                  href={`/match?mseId=${mseId}`}
                  className="btn-saffron inline-flex"
                >
                  Continue to Matching
                  <svg
                    className="ml-1.5 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
