"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const DomainPredictionCard = dynamic(
  () => import("@/components/DomainPredictionCard").then((m) => ({ default: m.DomainPredictionCard })),
  { ssr: false }
);
const TaxonomyBrowser = dynamic(
  () => import("@/components/TaxonomyBrowser").then((m) => ({ default: m.TaxonomyBrowser })),
  { ssr: false }
);
const ClassificationHistory = dynamic(
  () => import("@/components/ClassificationHistory").then((m) => ({ default: m.ClassificationHistory })),
  { ssr: false }
);
const VoiceInput = dynamic(
  () => import("@/components/VoiceInput"),
  { ssr: false }
);

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DOMAIN_NAMES: Record<string, string> = {
  RET10: "Grocery",
  RET12: "Fashion",
  RET14: "Electronics",
  RET16: "Home & Kitchen",
  RET18: "Health & Wellness",
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

interface PredictionItem {
  domain: string;
  confidence: number;
}

interface ClassifyResult {
  mse_id: number;
  top3: PredictionItem[];
  selected_domain: string;
  confidence: number;
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

export default function ClassifyPage() {
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);

  // Input state
  const [tab, setTab] = useState<TabMode>("text");
  const [mseId, setMseId] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");

  // Result state
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [mseInfo, setMseInfo] = useState<MSEInfo | null>(null);
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainerLang, setExplainerLang] = useState<"en" | "hi">("en");

  // Auto-load from URL params
  useEffect(() => {
    const paramId = searchParams.get("mseId");
    if (paramId && !autoTriggered.current) {
      autoTriggered.current = true;
      setMseId(paramId);
      setTab("mse");
    }
  }, [searchParams]);

  // Load domains on mount
  useEffect(() => {
    fetch(`${API}/domains/`)
      .then((r) => r.json())
      .then(setDomains)
      .catch(() => {});
  }, []);

  // Auto-trigger classification when mseId comes from URL
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
      // Fetch MSE info
      const mseRes = await fetch(`${API}/mse/${mseId}`);
      if (!mseRes.ok) throw new Error("MSE not found");
      const mse: MSEInfo = await mseRes.json();
      setMseInfo(mse);

      // Classify
      const classifyRes = await fetch(`${API}/classify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mse_id: parseInt(mseId) }),
      });
      if (!classifyRes.ok) throw new Error("Classification failed");
      const data: ClassifyResult = await classifyRes.json();
      setResult(data);

      // Fetch history
      const histRes = await fetch(`${API}/classify/history/${mseId}`);
      if (histRes.ok) {
        const hist = await histRes.json();
        setHistory(hist);
      }
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
      const data: ClassifyResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = () => {
    if (tab === "mse") classifyByMSE();
    else classifyByText();
  };

  return (
    <div className="space-y-8">
      {/* ── Input Card ────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-surface-100">
          {(
            [
              { key: "text" as TabMode, label: "By Description" },
              { key: "mse" as TabMode, label: "By MSE ID" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-brand-500 text-brand-900 bg-brand-50/30"
                  : "text-surface-400 hover:text-surface-600 hover:bg-surface-50"
              }`}
            >
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
      </div>

      {/* ── Error State ───────────────────────────────────────────── */}
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

      {/* ── Empty State (before first classification) ──────────────── */}
      {!result && !loading && !error && (
        <div className="glass-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
            <svg
              className="h-7 w-7 text-surface-400"
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
          <h3 className="font-display text-lg font-bold text-brand-900">
            Ready to Classify
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-surface-500">
            Enter an MSE ID or describe a business above to classify it into the
            appropriate ONDC retail domain.
          </p>
        </div>
      )}

      {/* ── Loading State ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-brand-500"
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
            <span className="text-sm font-medium text-surface-500">
              Running VargBot classification...
            </span>
          </div>
        </div>
      )}

      {/* ── Results Section ───────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* MSE info bar (only in MSE mode) */}
            {mseInfo && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 bg-white px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    MSE
                  </span>
                  <span className="font-display text-sm font-bold text-brand-900">
                    {mseInfo.name}
                  </span>
                </div>
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
            )}

            {/* Prediction cards */}
            <div>
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-900">
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
                  <DomainPredictionCard
                    key={pred.domain}
                    domain={pred.domain}
                    domainName={DOMAIN_NAMES[pred.domain] ?? pred.domain}
                    confidence={pred.confidence}
                    rank={i + 1}
                    isSelected={i === 0}
                  />
                ))}
              </div>
            </div>

            {/* AI Explainer */}
            <div className="glass-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500">
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                      <path d="M18 14v1a6 6 0 01-12 0v-1" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                    AI Explainer
                  </span>
                </div>
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
              </div>
              <p className="text-sm leading-relaxed text-surface-600">
                {DOMAIN_EXPLAINERS[result.selected_domain]?.[explainerLang] ??
                  `Classified under ${
                    DOMAIN_NAMES[result.selected_domain] ??
                    result.selected_domain
                  }.`}
              </p>
            </div>

            {/* Taxonomy Browser */}
            {domains.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-900">
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
                />
              </div>
            )}

            {/* Classification History (MSE mode only) */}
            {tab === "mse" && mseInfo && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-900">
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
                  History
                </h3>
                <ClassificationHistory
                  mseId={mseInfo.id}
                  history={history}
                />
              </div>
            )}

            {/* Continue to Matching CTA */}
            {tab === "mse" && mseId && (
              <div className="flex justify-center pt-2">
                <a
                  href={`/match?mseId=${mseId}`}
                  className="btn-saffron inline-flex"
                >
                  Continue to Matching
                  <svg className="ml-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
