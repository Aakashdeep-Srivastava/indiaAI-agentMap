"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DocUploadButton from "@/components/sathi/DocUploadButton";
import VoiceOrb from "@/components/sathi/VoiceOrb";
import WaveformVisualizer from "@/components/sathi/WaveformVisualizer";
import LiveTranscript from "@/components/sathi/LiveTranscript";
import { useAudioAnalyzer } from "@/lib/useAudioAnalyzer";
import {
  extractFieldsFromAPI,
  extractFieldsFromText,
  getMissingFields,
  countFilledFields,
  detectLanguage,
} from "@/lib/extractFields";

/* ─── Types ─── */
type OrbPhase = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  role: "sathi" | "user";
  text: string;
  filledFields?: string[];
  quickReplies?: { label: string; value: string }[];
}

interface FormState {
  udyam_number: string;
  name: string;
  description: string;
  state: string;
  district: string;
  pin_code: string;
  nic_code: string;
  language: string;
  turnover_band: string;
  mobile_number: string;
  products: string;
}

interface SathiAgentProps {
  form: FormState;
  onUpdate: (field: string, value: string) => void;
  onHighlight: (fields: string[]) => void;
  onSubmit: () => void;
  submitting: boolean;
  success: number | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOTAL_FIELDS = 8;

const FIELD_LABELS: Record<string, string> = {
  name: "Business Name",
  udyam_number: "Udyam Number",
  mobile_number: "Mobile Number",
  description: "Description",
  products: "Products",
  turnover_band: "Enterprise Size",
  state: "State",
  district: "District",
  pin_code: "PIN Code",
};

const FIELD_QUESTIONS: Record<string, string> = {
  udyam_number: "What's your Udyam Registration Number? (e.g., UDYAM-MH-02-0012345)",
  name: "What's your business or enterprise name?",
  mobile_number: "What's your 10-digit mobile number?",
  description: "Describe your business in a few sentences — what do you make or sell?",
  products: "What products or services do you offer? (comma-separated)",
  state: "Which state is your business located in?",
  district: "Which district or city?",
  pin_code: "What's your area PIN code? (6 digits)",
  turnover_band: "What size is your enterprise — Micro, Small, or Medium?",
};

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
];

export default function SathiAgent({
  form,
  onUpdate,
  onHighlight,
  onSubmit,
  submitting,
  success,
}: SathiAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [complete, setComplete] = useState(false);

  /* ─── Voice-first state ─── */
  const [orbPhase, setOrbPhase] = useState<OrbPhase>("idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [latestTranscript, setLatestTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const initRef = useRef(false);
  const currentFieldRef = useRef<string | null>(null);
  const langDetectedRef = useRef(false);
  const ttsRef = useRef(false);
  ttsRef.current = ttsEnabled;
  const ttsGenRef = useRef(0);

  const {
    start: startAnalyzer,
    stop: stopAnalyzer,
    frequencyData,
    isActive,
    bins,
  } = useAudioAnalyzer();

  const filledCount = countFilledFields(
    form as unknown as Record<string, string>,
  );

  /* ─── Cleanup analyzer on unmount ─── */
  useEffect(() => {
    return () => stopAnalyzer();
  }, [stopAnalyzer]);

  /* ─── Init conversation ─── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    setTimeout(() => {
      pushSathi(
        "Namaste! I'm Sathi, your AI registration assistant. Let's get your business onboarded to ONDC.",
      );
      setTimeout(() => {
        pushSathi(
          "You can type, speak, or upload a document anytime. I'll auto-detect your language (English/Hindi supported). Let's start!",
        );
        setTimeout(() => askNextField(), 600);
      }, 800);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Handle success ─── */
  useEffect(() => {
    if (success !== null && !complete) {
      setComplete(true);
      pushSathi(
        `Registration successful! Your MSE ID is ${success}. Redirecting to classification...`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  /* ─── Message helpers ─── */
  function pushSathi(
    text: string,
    filledFields?: string[],
    quickReplies?: { label: string; value: string }[],
  ) {
    const msg: ChatMessage = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "sathi",
      text,
      filledFields,
      quickReplies,
    };
    setMessages((prev) => [...prev, msg]);
    setCurrentQuestion(text);
    setOrbPhase("speaking");
    speak(text);
  }

  function pushUser(text: string) {
    const msg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, msg]);
    setLatestTranscript(text);
  }

  /* ─── Ask next missing field ─── */
  function askNextField(localForm?: Record<string, string>) {
    const f = (localForm || form) as Record<string, string>;
    const missing = getMissingFields(f);

    if (missing.length === 0) {
      currentFieldRef.current = null;
      setConfirming(true);
      pushSathi(
        "All details collected! Please review your information and hit Submit.",
      );
      return;
    }

    const nextLabel = missing[0];
    const nextKey = fieldToKey(nextLabel);
    currentFieldRef.current = nextKey;
    const question =
      FIELD_QUESTIONS[nextKey] || `What's your ${nextLabel}?`;
    const qr = getQuickReplies(nextKey);
    pushSathi(question, undefined, qr || undefined);
  }

  /* ─── TTS (browser fallback + Sarvam backend) ─── */
  function speak(text: string) {
    if (!ttsRef.current) {
      setOrbPhase("idle");
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setOrbPhase("idle");
      return;
    }

    const gen = ++ttsGenRef.current;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      ta: "ta-IN",
      te: "te-IN",
      kn: "kn-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      gu: "gu-IN",
    };
    utterance.lang = langMap[form.language] || "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (ttsGenRef.current === gen) setOrbPhase("idle");
    };
    window.speechSynthesis.speak(utterance);

    fetchBackendTTS(text, form.language, gen);
  }

  async function fetchBackendTTS(text: string, language: string, gen: number) {
    try {
      const res = await fetch(`${API}/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audio_base64 && data.content_type) {
        const sarvamGen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        const audio = new Audio(
          `data:${data.content_type};base64,${data.audio_base64}`,
        );
        audio.onended = () => {
          if (ttsGenRef.current === sarvamGen) setOrbPhase("idle");
        };
        audio.play().catch(() => {});
      }
    } catch {
      // browser TTS already playing as fallback
    }
  }

  /* ─── Handle text send ─── */
  function handleSend() {
    const text = input.trim();
    if (!text || processing || complete) return;
    setInput("");
    pushUser(text);
    processUserInput(text);
  }

  /* ─── Process user input: extract via LLM API, validate, fill ─── */
  async function processUserInput(text: string) {
    setProcessing(true);
    setOrbPhase("processing");
    const localForm: Record<string, string> = {
      ...(form as unknown as Record<string, string>),
    };

    // Auto-detect language on first user message (don't flip-flop)
    if (!langDetectedRef.current) {
      langDetectedRef.current = true;
      const detectedLang = detectLanguage(text);
      onUpdate("language", detectedLang);
      localForm.language = detectedLang;
    }

    // Call Sarvam-m LLM API for extraction (falls back to regex automatically)
    const { fields: extracted } = await extractFieldsFromAPI(text, localForm);
    const filledKeys: string[] = [];

    for (const [key, value] of Object.entries(extracted)) {
      if (value && !localForm[key]) {
        const err = validateField(key, value);
        if (!err) {
          onUpdate(key, value);
          localForm[key] = value;
          filledKeys.push(key);
        }
      }
    }

    if (filledKeys.length > 0) {
      onHighlight(filledKeys);
      const labels = filledKeys.map((k) => FIELD_LABELS[k] || k);
      pushSathi(
        filledKeys.length === 1
          ? `Got it! Updated your ${labels[0]}.`
          : `Great! Filled ${filledKeys.length} fields: ${labels.join(", ")}.`,
        filledKeys,
      );
    } else {
      // Direct answer for current question
      const currentKey = currentFieldRef.current;
      if (currentKey && !localForm[currentKey]) {
        const err = validateField(currentKey, text);
        if (err) {
          pushSathi(err);
          setProcessing(false);
          return;
        }
        onUpdate(currentKey, text);
        localForm[currentKey] = text;
        onHighlight([currentKey]);
        pushSathi(`Noted!`, [currentKey]);
      } else {
        pushSathi(
          "Thanks! Let me continue with the next question.",
        );
      }
    }

    setProcessing(false);
    setTimeout(() => askNextField(localForm), 600);
  }

  /* ─── Validation ─── */
  function validateField(key: string, value: string): string | null {
    const v = value.trim();
    switch (key) {
      case "udyam_number":
        if (!/^UDYAM[-\s]?[A-Z]{2}[-\s]?\d{2}[-\s]?\d{7}$/i.test(v))
          return "That doesn't look like a valid Udyam number. Format: UDYAM-XX-00-0000001. Try again.";
        break;
      case "mobile_number":
        if (!/^[6-9]\d{9}$/.test(v))
          return "Please enter a valid 10-digit Indian mobile number (starting with 6-9).";
        break;
      case "pin_code":
        if (!/^[1-9]\d{5}$/.test(v))
          return "PIN code should be 6 digits (e.g., 411001). Try again.";
        break;
    }
    return null;
  }

  /* ─── Voice recording ─── */
  async function toggleRecording() {
    if (recording) {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecording(false);
      stopAnalyzer();
      setOrbPhase("processing");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => handleRecordingDone();
        recorder.start();
        mediaRecorderRef.current = recorder;
        startAnalyzer(stream);
        setRecording(true);
        setOrbPhase("listening");
        setLatestTranscript("");
      } catch {
        pushSathi(
          "Couldn't access your microphone. Please check browser permissions.",
        );
      }
    }
  }

  async function handleRecordingDone() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 100) {
      pushSathi("That was too short. Please speak for a bit longer.");
      return;
    }

    setProcessing(true);
    setOrbPhase("processing");

    try {
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      fd.append("language", "auto");
      fd.append("field_hint", currentFieldRef.current || "description");

      const res = await fetch(`${API}/stt/transcribe`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || "").trim();

      // Auto-set language from STT detected_language if available
      if (data.detected_language && !langDetectedRef.current) {
        langDetectedRef.current = true;
        onUpdate("language", data.detected_language);
      }

      if (text) {
        pushUser(text);
        processUserInput(text);
      } else {
        setProcessing(false);
        setOrbPhase("idle");
        pushSathi("I couldn't catch that. Could you try again?");
      }
    } catch {
      setProcessing(false);
      setOrbPhase("idle");
      pushSathi(
        "Voice service unavailable. Please type your response instead.",
      );
    }
  }

  /* ─── Document upload via OCR ─── */
  async function handleDocUpload(file: File) {
    setDocUploading(true);
    pushUser(`Uploaded: ${file.name}`);

    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("language", form.language || "en");

      const res = await fetch(`${API}/ocr/extract`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const fields: Record<string, string> = data.extracted_fields || {};

      const localForm: Record<string, string> = {
        ...(form as unknown as Record<string, string>),
      };
      const filledKeys: string[] = [];

      for (const [key, value] of Object.entries(fields)) {
        if (value && !localForm[key]) {
          onUpdate(key, value);
          localForm[key] = value;
          filledKeys.push(key);
        }
      }

      if (filledKeys.length > 0) {
        onHighlight(filledKeys);
        pushSathi(
          `Extracted ${filledKeys.length} fields from your document!`,
          filledKeys,
        );
      } else {
        pushSathi(
          "Couldn't extract new fields from this document. Let's continue.",
        );
      }

      setTimeout(() => askNextField(localForm), 600);
    } catch {
      pushSathi(
        "Couldn't read the document. Please try a clearer image or type instead.",
      );
    } finally {
      setDocUploading(false);
    }
  }

  /* ─── Quick reply handler ─── */
  function handleQuickReply(value: string, label: string) {
    pushUser(label);
    const key = currentFieldRef.current;
    if (key) {
      const localForm: Record<string, string> = {
        ...(form as unknown as Record<string, string>),
      };
      onUpdate(key, value);
      localForm[key] = value;
      onHighlight([key]);
      pushSathi(`Got it!`, [key]);
      setTimeout(() => askNextField(localForm), 600);
    }
  }

  /* ─── Computed values ─── */
  const lastSathiMsg = [...messages].reverse().find((m) => m.role === "sathi");
  const activeQuickReplies = lastSathiMsg?.quickReplies || [];
  const allFilledKeys = Object.entries(
    form as unknown as Record<string, string>,
  )
    .filter(([, v]) => v && v.trim())
    .map(([k]) => k);

  const orbState: "idle" | "listening" | "processing" =
    orbPhase === "speaking" ? "idle" : orbPhase;

  const isDisabled = complete || submitting;

  /* ─── Render ─── */
  return (
    <div className="sathi-chat">
      {/* ─── Header ─── */}
      <div className="sathi-chat-header">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-saffron-400 to-saffron-500">
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-white">Sathi</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50">AI Registration Copilot</span>
            <span className="text-[10px] text-white/30">|</span>
            <span className="text-[10px] text-saffron-400">
              {filledCount}/{TOTAL_FIELDS} fields
            </span>
          </div>
        </div>

        {/* TTS toggle */}
        <button
          onClick={() => {
            setTtsEnabled(!ttsEnabled);
            if (ttsEnabled) window.speechSynthesis?.cancel();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
          title={ttsEnabled ? "Mute Sathi" : "Unmute Sathi"}
        >
          {ttsEnabled ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>

        {/* Language selector */}
        <select
          value={form.language}
          onChange={(e) => onUpdate("language", e.target.value)}
          className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80 outline-none transition hover:bg-white/20"
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l.code} value={l.code} className="text-brand-900">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="h-0.5 bg-surface-100">
        <div
          className="h-full bg-gradient-to-r from-saffron-500 to-saffron-400 transition-all duration-500"
          style={{ width: `${(filledCount / TOTAL_FIELDS) * 100}%` }}
        />
      </div>

      {/* ─── Center content ─── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {confirming && !complete ? (
            /* ─── Confirmation card ─── */
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-sm"
            >
              <div className="space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  Registration Summary
                </p>
                <div className="space-y-1.5">
                  {(
                    [
                      ["Business", form.name],
                      ["Udyam", form.udyam_number],
                      ["Mobile", form.mobile_number],
                      ["Products", form.products],
                      ["Location", [form.district, form.state].filter(Boolean).join(", ")],
                      ["PIN", form.pin_code],
                    ] as [string, string][]
                  ).map(([label, val]) =>
                    val ? (
                      <div key={label} className="flex items-start gap-2 text-xs">
                        <span className="w-16 shrink-0 font-medium text-surface-400">
                          {label}
                        </span>
                        <span className="text-brand-900">{val}</span>
                      </div>
                    ) : null,
                  )}
                </div>
                {!submitting && success === null && (
                  <button
                    onClick={onSubmit}
                    className="btn-saffron w-full !py-2.5 !text-xs"
                  >
                    Submit Registration
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
                {submitting && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-brand-500">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering your business...
                  </div>
                )}
              </div>
            </motion.div>
          ) : complete ? (
            /* ─── Success card ─── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700">
                  MSE ID: {success}
                </p>
                <p className="mt-1 text-[11px] text-emerald-600/70">
                  Redirecting to classification...
                </p>
              </div>
            </motion.div>
          ) : (
            /* ─── Voice-first orb layout ─── */
            <motion.div
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-col items-center gap-5"
            >
              {/* Orb */}
              <div className="pt-2 pb-4">
                <VoiceOrb
                  state={orbState}
                  onClick={toggleRecording}
                  disabled={isDisabled || orbPhase === "speaking" || processing}
                />
              </div>

              {/* Waveform */}
              <WaveformVisualizer
                frequencyData={frequencyData}
                isActive={isActive}
                bins={bins}
              />

              {/* Current question from Sathi */}
              {currentQuestion && (
                <motion.p
                  key={currentQuestion}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-xs text-center text-sm leading-relaxed text-surface-600"
                >
                  {currentQuestion}
                </motion.p>
              )}

              {/* Live transcript of user speech */}
              <LiveTranscript
                text={latestTranscript}
                isListening={orbPhase === "listening"}
              />

              {/* Quick replies */}
              {activeQuickReplies.length > 0 && !confirming && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {activeQuickReplies.map((qr) => (
                    <button
                      key={qr.value}
                      onClick={() => handleQuickReply(qr.value, qr.label)}
                      disabled={isDisabled}
                      className="sathi-quick-chip"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filled field badges */}
              {allFilledKeys.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {allFilledKeys.map((k) => (
                    <span key={k} className="sathi-field-badge">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {FIELD_LABELS[k] || k}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Input bar ─── */}
      <div className="sathi-input-bar">
        <DocUploadButton
          onFileSelect={handleDocUpload}
          uploading={docUploading}
          disabled={isDisabled}
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            complete
              ? "Registration complete!"
              : recording
                ? "Listening..."
                : "Type your response..."
          }
          disabled={isDisabled}
          className="input-field flex-1 !py-2.5 !rounded-xl"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || isDisabled || processing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function fieldToKey(label: string): string {
  const map: Record<string, string> = {
    "business name": "name",
    "udyam number": "udyam_number",
    "mobile number": "mobile_number",
    "business description": "description",
    state: "state",
    district: "district",
    "pin code": "pin_code",
    "products or services": "products",
    "enterprise size": "turnover_band",
  };
  return map[label] || label;
}

function getQuickReplies(
  field: string,
): { label: string; value: string }[] | null {
  switch (field) {
    case "turnover_band":
      return [
        { label: "Micro", value: "micro" },
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
      ];
    case "state":
      return [
        { label: "Maharashtra", value: "Maharashtra" },
        { label: "Uttar Pradesh", value: "Uttar Pradesh" },
        { label: "Karnataka", value: "Karnataka" },
        { label: "Tamil Nadu", value: "Tamil Nadu" },
        { label: "Gujarat", value: "Gujarat" },
        { label: "Delhi", value: "Delhi" },
        { label: "Rajasthan", value: "Rajasthan" },
        { label: "West Bengal", value: "West Bengal" },
      ];
    default:
      return null;
  }
}
