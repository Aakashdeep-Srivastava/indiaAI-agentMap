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
const MSEPicker = dynamic(() => import("@/components/MSEPicker"), { ssr: false });

import { apiFetch, getSession } from "@/lib/auth";

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

/* User-facing engine labels — descriptive only, no raw model/vendor internals. */
const ENGINE_META: Record<
  string,
  { label: string; desc: string; classes: string }
> = {
  "sarvam-llm": {
    label: "VargBot AI",
    desc: "Sovereign language understanding",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "vargbot-tfidf-v1+sarvam-30b": {
    label: "VargBot Trained Model + AI",
    desc: "Trained taxonomy classifier; AI resolves the category detail",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
  "vargbot-tfidf-v1": {
    label: "VargBot Trained Model",
    desc: "Trained taxonomy classifier",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
  "muril-lora": {
    label: "VargBot Classifier",
    desc: "Fine-tuned taxonomy model",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
  "keyword-fallback": {
    label: "Rule Engine",
    desc: "Deterministic fallback",
    classes: "bg-surface-50 text-surface-600 border-surface-200",
  },
};
// Legacy engine identifiers from earlier records map to a neutral label.
const LEGACY_ENGINE: { label: string; desc: string; classes: string } = {
  label: "VargBot AI",
  desc: "Language understanding",
  classes: "bg-amber-50 text-amber-700 border-amber-200",
};

const PIPELINE_STAGES = ["Language Analysis", "Taxonomy Mapping", "Confidence Check"];

const EXAMPLES = [
  "We produce pure silk sarees with traditional Banarasi weaving",
  "हम मुरादाबाद में पीतल के दीये और मूर्तियाँ बनाते हैं",
  "Organic honey and herbal wellness products from Uttarakhand",
];

/* The three ways into VargBot — MSE owners get these on the panel navbar */
const INPUT_MODES = [
  {
    key: "text",
    label: "Describe Business",
    icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4",
  },
  {
    key: "mse",
    label: "My Business",
    icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  },
  {
    key: "import",
    label: "Import Products",
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  },
] as const;

/* ─── Types ───────────────────────────────────────────────────────── */

interface PredictionItem {
  domain: string;
  confidence: number;
  category?: string;
  category_name?: string;
  explanation?: string;
}

interface ComplianceItem {
  name: string;
  note: string;
  status: "done" | "action";
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
  attributes?: Record<string, string>;
  compliance?: ComplianceItem[];
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

type TabMode = "mse" | "text" | "import";

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

/** Minimal expand/collapse row — the page's progressive-disclosure primitive. */
function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-surface-100 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-surface-50/60"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          <svg className="h-3 w-3 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.span>
        <span className="text-xs font-semibold text-brand-900">{title}</span>
        {hint && !open && (
          <span className="min-w-0 flex-1 truncate text-right text-[11px] text-surface-400">
            {hint}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-100 px-4 py-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfidenceDistribution({
  predictions,
  nameOf,
}: {
  predictions: PredictionItem[];
  nameOf?: (code: string) => string;
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
              {(nameOf ?? ((c: string) => DOMAIN_NAMES[c] ?? c))(p.domain)}{" "}
              {(p.confidence * 100).toFixed(1)}%
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
  const catFileRef = useRef<HTMLInputElement>(null);
  const [catUploading, setCatUploading] = useState(false);
  const [catResult, setCatResult] = useState<{ total: number; valid: number } | null>(null);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");

  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [mseInfo, setMseInfo] = useState<MSEInfo | null>(null);
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainerLang, setExplainerLang] = useState<"en" | "hi">("en");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getSession()?.role === "admin");
  }, []);

  /* Deep-links: sidebar quick actions land on a specific input mode via ?tab= */
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const paramId = searchParams.get("mseId");
    if (tabParam === "import") {
      setTab("import");
      if (paramId) setMseId(paramId);
      return;
    }
    if (tabParam === "describe") {
      setTab("text");
      return;
    }
    if (paramId && !autoTriggered.current) {
      autoTriggered.current = true;
      setMseId(paramId);
      setTab("mse");
    }
  }, [searchParams]);

  useEffect(() => {
    apiFetch(`/domains/`)
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

  const classifyByMSE = async (idArg?: string) => {
    const id = (idArg ?? mseId).trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMseInfo(null);
    setHistory([]);
    try {
      const mseRes = await apiFetch(`/mse/${id}`);
      if (!mseRes.ok) throw new Error("Business not found");
      const mse: MSEInfo = await mseRes.json();
      setMseInfo(mse);
      const classifyRes = await apiFetch(`/classify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mse_id: parseInt(id) }),
      });
      if (!classifyRes.ok) throw new Error("Classification failed");
      setResult(await classifyRes.json());
      const histRes = await apiFetch(`/classify/history/${id}`);
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
      const res = await apiFetch(`/classify/text`, {
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

  /** Resolve a domain code to its human name — live taxonomy first, PoC constants second. */
  const domainName = (code: string) =>
    domains.find((d) => d.code === code)?.name ?? DOMAIN_NAMES[code] ?? code;

  const engineInfo = result?.engine
    ? ENGINE_META[result.engine] ?? LEGACY_ENGINE
    : null;
  const topIcon = result
    ? DOMAIN_ICONS[result.selected_domain] ?? DOMAIN_ICONS.RET10
    : "";
  const actionItems = result?.compliance?.filter((c) => c.status === "action") ?? [];
  const doneItems = result?.compliance?.filter((c) => c.status === "done") ?? [];

  return (
    <div className="space-y-5">
      {/* ═══ Panel Navbar — VargBot identity + input modes ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card px-4 py-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900 shadow-lg shadow-brand-900/20">
              <svg
                className="h-5 w-5 text-white"
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
              <h1 className="font-display text-lg font-extrabold leading-tight tracking-tight text-brand-900">
                VargBot
              </h1>
              <p className="text-[11px] text-surface-500 sm:text-xs">
                Puts your business in the right ONDC category
              </p>
            </div>
          </div>

          {/* Input-mode nav — MSE owners only, never on the NSIC admin view */}
          {!isAdmin ? (
            <nav
              aria-label="VargBot input modes"
              className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-100/80 p-1 sm:w-auto"
            >
              {INPUT_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTab(m.key)}
                  aria-pressed={tab === m.key}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:flex-none sm:px-3.5 ${
                    tab === m.key
                      ? "bg-white text-brand-900 shadow-sm"
                      : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 ${tab === m.key ? "text-saffron-500" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={m.icon} />
                  </svg>
                  {m.label}
                </button>
              ))}
            </nav>
          ) : (
            <span className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Module 2
            </span>
          )}
        </div>
      </motion.div>

      {/* ═══ Input Card ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card overflow-hidden"
      >
        {/* Tab switcher — admin only (MSE owners switch via the panel navbar) */}
        {isAdmin && (
          <div className="m-3 mb-0 flex gap-1 rounded-xl bg-surface-100/80 p-1">
            {INPUT_MODES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:gap-2 sm:text-sm ${
                  tab === t.key
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                <svg
                  className={`h-4 w-4 shrink-0 ${tab === t.key ? "text-brand-500" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={t.icon} />
                </svg>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-4 sm:p-5">
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
                    Your Business
                  </label>
                  <MSEPicker
                    onSelect={(m) => {
                      setMseId(String(m.id));
                      classifyByMSE(String(m.id));
                    }}
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

                {/* Nudge toward the Import tab for bulk product data */}
                <button
                  onClick={() => setTab("import")}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed border-surface-300 bg-surface-50/50 px-3.5 py-2.5 text-left transition-colors hover:border-brand-500/40 hover:bg-brand-50/30"
                >
                  <span className="text-[11px] font-medium text-surface-500">
                    Have a product list or catalogue file? Import it — every
                    product gets categorised.
                  </span>
                  <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </motion.div>
            ) : tab === "import" ? (
              <motion.div
                key="import"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    Which business is this for?
                  </label>
                  <MSEPicker onSelect={(m) => setMseId(String(m.id))} />
                </div>

                {/* Dropzone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload product catalogue file"
                  onClick={() => mseId.trim() && catFileRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && mseId.trim() && catFileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f && catFileRef.current) {
                      const dt = new DataTransfer();
                      dt.items.add(f);
                      catFileRef.current.files = dt.files;
                      catFileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
                    mseId.trim()
                      ? "cursor-pointer border-brand-500/30 bg-brand-50/20 hover:border-brand-500/60 hover:bg-brand-50/40"
                      : "cursor-not-allowed border-surface-200 bg-surface-50/50 opacity-60"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10">
                    {catUploading ? (
                      <svg className="h-5 w-5 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-900">
                      {catUploading
                        ? "Reading your products…"
                        : "Drop your product file here, or click to browse"}
                    </p>
                    <p className="mt-1 text-[11px] text-surface-500">
                      Excel or CSV — the list you already keep works. Every
                      product is validated &amp; mapped to ONDC categories.
                    </p>
                  </div>
                  {!mseId.trim() && (
                    <p className="text-[11px] font-medium text-saffron-600">
                      Pick your business above first
                    </p>
                  )}
                </div>

                {catResult && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-medium text-emerald-800">
                      {catResult.valid}/{catResult.total} products ONDC-ready —
                      profile enriched for matching.
                    </p>
                    <a href="/catalogue" className="shrink-0 text-xs font-semibold text-brand-500 hover:underline">
                      Full details →
                    </a>
                  </div>
                )}

                <input
                  ref={catFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f || !mseId.trim()) return;
                    setCatUploading(true);
                    setCatResult(null);
                    try {
                      const fd = new FormData();
                      fd.append("file", f, f.name);
                      fd.append("mse_id", mseId.trim());
                      const res = await apiFetch(`/catalogue/upload`, { method: "POST", body: fd }, 120000);
                      if (res.ok) {
                        const d = await res.json();
                        setCatResult({ total: d.total_rows, valid: d.valid_rows });
                      }
                    } finally {
                      setCatUploading(false);
                    }
                  }}
                />

                <p className="text-center text-[11px] leading-relaxed text-surface-400">
                  Udyam certificate, GST or PAN documents? Sathi reads those
                  during{" "}
                  <a href="/register" className="font-semibold text-brand-500 hover:underline">
                    registration
                  </a>{" "}
                  — voice, photo or PDF.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                    What does your business sell?
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    aria-label="Language"
                    className="cursor-pointer rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-medium text-surface-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                    <option value="hi-en">Hinglish</option>
                    <option value="ta">தமிழ்</option>
                    <option value="te">తెలుగు</option>
                    <option value="bn">বাংলা</option>
                    <option value="mr">मराठी</option>
                    <option value="gu">ગુજરાતી</option>
                  </select>
                </div>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 'We sell rice, dal, spices, and grocery items to local customers'"
                    className="input-field min-h-[96px] resize-y pr-16"
                    rows={3}
                  />
                  <div className="absolute bottom-2.5 right-2.5 flex flex-col items-center">
                    <VoiceInput
                      language={language}
                      fieldLabel="Business Description"
                      onTranscribe={(text) =>
                        setDescription((prev) =>
                          prev ? prev + " " + text : text
                        )
                      }
                    />
                    <span className="mt-0.5 text-[10px] font-medium text-surface-400">
                      बोलिए
                    </span>
                  </div>
                </div>
                {!description.trim() && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                      Try:
                    </span>
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setDescription(ex)}
                        className="max-w-full cursor-pointer truncate rounded-full border border-surface-200 bg-white px-3 py-1 text-[11px] font-medium text-surface-500 transition-colors hover:border-brand-500/40 hover:bg-brand-50/40 hover:text-brand-900"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
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

      {/* ═══ How it works (empty state) ═══════════════════════════════ */}
      {!result && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5 sm:p-6"
        >
          <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
            {[
              {
                step: "1",
                title: "Tell us what you sell",
                desc: "Type it, speak it in your language, or import your product list.",
                icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4",
                accent: "bg-saffron-500/10 text-saffron-500",
              },
              {
                step: "2",
                title: "Get your ONDC category",
                desc: "VargBot places your business where buyers and platforms look for it.",
                icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
                accent: "bg-brand-500/10 text-brand-500",
              },
              {
                step: "3",
                title: "Meet your seller platform",
                desc: "JodakAI ranks ONDC platforms that fit your products and district.",
                icon: "M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z",
                accent: "bg-emerald-500/10 text-emerald-600",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="relative flex items-start gap-3"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.accent}`}>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={s.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-brand-900">
                    <span className="font-mono text-[10px] text-surface-400">
                      {s.step}
                    </span>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-surface-500">
                    {s.desc}
                  </p>
                </div>
                {/* Connector arrow between steps (desktop) */}
                {i < 2 && (
                  <svg
                    className="absolute -right-3 top-3 hidden h-3.5 w-3.5 text-surface-300 sm:block"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ Loading State ════════════════════════════════════════════ */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card py-10"
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
              {PIPELINE_STAGES.map((name, i) => (
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
                  {i < PIPELINE_STAGES.length - 1 && (
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
            className="space-y-5"
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

              <div className="p-5">
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
                          {domainName(result.selected_domain)}
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
                      <ConfidenceDistribution
                        predictions={result.top3}
                        nameOf={domainName}
                      />
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
                      domainName={domainName(pred.domain)}
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
                      Why this classification
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
              <div className="space-y-3 p-5">
                {/* The one-line verdict, always visible */}
                <p className="text-sm leading-relaxed text-surface-600">
                  {result.explanation ??
                    DOMAIN_EXPLAINERS[result.selected_domain]?.[
                      explainerLang
                    ] ??
                    `Classified under ${domainName(result.selected_domain)}.`}
                </p>

                {/* Everything else opens on demand */}
                {result.attributes && Object.keys(result.attributes).length > 0 && (
                  <Disclosure
                    title="What VargBot understood about your products"
                    hint={Object.values(result.attributes).slice(0, 3).join(" · ")}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(result.attributes).map(([k, v]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-1 text-[11px]"
                        >
                          <span className="font-medium capitalize text-surface-400">
                            {k.replace(/_/g, " ")}
                          </span>
                          <span className="font-semibold text-brand-900">{v}</span>
                        </span>
                      ))}
                    </div>
                  </Disclosure>
                )}

                {result.top3.some((p) => p.explanation) && (
                  <Disclosure
                    title="Why not the other categories?"
                    hint={`${result.top3.filter((p) => p.explanation).length} alternatives considered`}
                  >
                    <div className="space-y-2.5">
                      {result.top3.map(
                        (pred, i) =>
                          pred.explanation && (
                            <div key={pred.domain} className="flex items-start gap-2">
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
                                  {domainName(pred.domain)}:
                                </span>{" "}
                                {pred.explanation}
                              </p>
                            </div>
                          )
                      )}
                    </div>
                  </Disclosure>
                )}
              </div>
            </motion.div>

            {/* ── Your ONDC Journey — what happened, what's next ────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="glass-card overflow-hidden"
            >
              <div className="border-b border-surface-100 bg-surface-50/40 px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                  Your ONDC Journey
                </span>
              </div>
              <div className="p-5">
                <ol className="relative space-y-0 border-l-2 border-surface-100 pl-6 [&>li]:relative [&>li]:pb-6 last:[&>li]:pb-0">
                  {/* Step: classified (done) */}
                  <li>
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <p className="text-sm font-semibold text-brand-900">
                      Your business is classified for ONDC
                    </p>
                    <p className="mt-0.5 text-xs text-surface-500">
                      {domainName(result.selected_domain)}
                      {result.selected_category_name &&
                        ` · ${result.selected_category_name}`}{" "}
                      — seller platforms now know exactly where your products
                      belong.
                    </p>
                  </li>

                  {/* Steps: readiness items already in place */}
                  {doneItems.length > 0 && (
                    <li>
                      <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <p className="text-sm font-semibold text-brand-900">
                        Already in place
                      </p>
                      <p className="mt-0.5 text-xs text-surface-500">
                        {doneItems.map((c) => c.name).join(" · ")}
                      </p>
                    </li>
                  )}

                  {/* Steps: what to arrange next */}
                  {actionItems.map((c) => (
                    <li key={c.name}>
                      <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-saffron-500 bg-white ring-4 ring-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
                      </span>
                      <p className="text-sm font-semibold text-brand-900">{c.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-surface-500">
                        {c.note}
                      </p>
                    </li>
                  ))}

                  {/* Step: matching (next) */}
                  <li>
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                    <p className="text-sm font-semibold text-brand-900">
                      Next: find your seller platform
                    </p>
                    <p className="mt-0.5 text-xs text-surface-500">
                      JodakAI ranks {""}
                      ONDC seller platforms that fit your category, district and
                      language — with reasons you can read.
                    </p>
                    {mseId ? (
                      <a
                        href={`/match?mseId=${mseId}`}
                        className="btn-saffron mt-3 inline-flex !px-4 !py-2 !text-xs"
                      >
                        Find my matches
                        <svg className="ml-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        onClick={() => setTab("mse")}
                        className="btn-secondary mt-3 inline-flex !px-4 !py-2 !text-xs"
                      >
                        Classify my registered business to unlock matching
                      </button>
                    )}
                  </li>
                </ol>
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

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
