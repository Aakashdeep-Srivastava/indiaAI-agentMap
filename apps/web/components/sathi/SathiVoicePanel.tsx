"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceOrb from "@/components/sathi/VoiceOrb";
import WaveformVisualizer from "@/components/sathi/WaveformVisualizer";
import LiveTranscript from "@/components/sathi/LiveTranscript";
import ProgressRing from "@/components/sathi/ProgressRing";
import ExtractedFieldCard from "@/components/sathi/ExtractedFieldCard";
import { useAudioAnalyzer } from "@/lib/useAudioAnalyzer";
import {
  extractFieldsFromAPI,
  getMissingFields,
  countFilledFields,
  detectLanguage,
} from "@/lib/extractFields";

/* ─── Types ─── */
type OrbPhase = "idle" | "listening" | "processing" | "speaking";

interface FormState {
  udyam_number: string;
  name: string;
  description: string;
  state: string;
  district: string;
  pin_code: string;
  mobile_number: string;
  products: string;
  language: string;
  nic_code: string;
  turnover_band: string;
}

interface SathiVoicePanelProps {
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
  mobile_number: "Mobile",
  description: "Description",
  products: "Products",
  state: "State",
  district: "District",
  pin_code: "PIN Code",
};

const FIELD_ORDER = [
  "name",
  "udyam_number",
  "mobile_number",
  "description",
  "state",
  "district",
  "pin_code",
  "products",
];

const FIELD_QUESTIONS: Record<string, string> = {
  udyam_number:
    "What's your Udyam Registration Number? (e.g., UDYAM-MH-02-0012345)",
  name: "What's your business or enterprise name?",
  mobile_number: "What's your 10-digit mobile number?",
  description:
    "Describe your business in a few sentences — what do you make or sell?",
  products: "What products or services do you offer? (comma-separated)",
  state: "Which state is your business located in?",
  district: "Which district or city?",
  pin_code: "What's your area PIN code? (6 digits)",
};

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
];

function getQuickReplies(
  field: string,
): { label: string; value: string }[] | null {
  switch (field) {
    case "state":
      return [
        { label: "Maharashtra", value: "Maharashtra" },
        { label: "Uttar Pradesh", value: "Uttar Pradesh" },
        { label: "Karnataka", value: "Karnataka" },
        { label: "Tamil Nadu", value: "Tamil Nadu" },
        { label: "Gujarat", value: "Gujarat" },
        { label: "Delhi", value: "Delhi" },
      ];
    default:
      return null;
  }
}

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
  };
  return map[label] || label;
}

/* ─── Panel Component ─── */
export default function SathiVoicePanel({
  form,
  onUpdate,
  onHighlight,
  onSubmit,
  submitting,
  success,
}: SathiVoicePanelProps) {
  /* Voice state */
  const [orbPhase, setOrbPhase] = useState<OrbPhase>("idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [latestTranscript, setLatestTranscript] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<
    { text: string; time: string }[]
  >([]);
  const [recentlyFilled, setRecentlyFilled] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [complete, setComplete] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  /* Refs */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const currentFieldRef = useRef<string | null>(null);
  const langDetectedRef = useRef(false);
  const ttsRef = useRef(false);
  ttsRef.current = ttsEnabled;
  const ttsGenRef = useRef(0);
  const initRef = useRef(false);
  const transcriptLogRef = useRef<HTMLDivElement>(null);
  const recentTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

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

  /* ─── Auto-scroll transcript log ─── */
  useEffect(() => {
    transcriptLogRef.current?.scrollTo({
      top: transcriptLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcriptHistory]);

  /* ─── Cleanup ─── */
  useEffect(() => {
    return () => {
      stopAnalyzer();
      stopSilenceDetection();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAnalyzer]);

  /* ─── Init conversation ─── */
  const isFirstInput = useRef(true);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setTimeout(() => {
      const greeting =
        "Namaste! I'm Sathi, your AI registration assistant. Tell me about your business — name, Udyam number, location, products — everything in one go, or one at a time. I'll fill the form for you!";
      setCurrentQuestion(greeting);
      setOrbPhase("speaking");
      speak(greeting);
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Handle success ─── */
  useEffect(() => {
    if (success !== null && !complete) {
      setComplete(true);
      const msg = `Registration successful! Your MSE ID is ${success}. Redirecting to classification...`;
      setCurrentQuestion(msg);
      setOrbPhase("speaking");
      speak(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  /* ─── Mark recently filled (glow) ─── */
  const markRecentlyFilled = useCallback((keys: string[]) => {
    setRecentlyFilled((prev) => [...new Set([...prev, ...keys])]);
    for (const k of keys) {
      if (recentTimers.current[k]) clearTimeout(recentTimers.current[k]);
      recentTimers.current[k] = setTimeout(() => {
        setRecentlyFilled((prev) => prev.filter((x) => x !== k));
      }, 3000);
    }
  }, []);

  /* ─── TTS ─── */
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
    };
    utterance.lang = langMap[form.language] || "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (ttsGenRef.current === gen) setOrbPhase("idle");
    };
    window.speechSynthesis.speak(utterance);
    fetchBackendTTS(text, form.language, gen);
  }

  async function fetchBackendTTS(
    text: string,
    language: string,
    gen: number,
  ) {
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
      // browser TTS fallback
    }
  }

  /* ─── Ask next field ─── */
  function askNextField(localForm?: Record<string, string>) {
    const f = (localForm || form) as Record<string, string>;
    const missing = getMissingFields(f);

    if (missing.length === 0) {
      currentFieldRef.current = null;
      setConfirming(true);
      const msg = "All details collected! Please review and hit Submit.";
      setCurrentQuestion(msg);
      setOrbPhase("speaking");
      speak(msg);
      return;
    }

    // After first input, tell the user what's still needed
    if (!isFirstInput.current && missing.length > 1) {
      const nextKey = fieldToKey(missing[0]);
      currentFieldRef.current = nextKey;
      const msg = `Got it! I still need your ${missing.join(", ")}. You can tell me all at once or one by one.`;
      setCurrentQuestion(msg);
      setOrbPhase("speaking");
      speak(msg);
      return;
    }

    // Only one field left — ask specifically
    const nextLabel = missing[0];
    const nextKey = fieldToKey(nextLabel);
    currentFieldRef.current = nextKey;
    const question =
      FIELD_QUESTIONS[nextKey] || `What's your ${nextLabel}?`;
    setCurrentQuestion(question);
    setOrbPhase("speaking");
    speak(question);
  }

  /* ─── Validation & auto-format ─── */
  // Returns { clean: string } on success, { error: string } on failure
  function validateField(
    key: string,
    value: string,
  ): { clean: string } | { error: string } {
    const v = value.trim();
    switch (key) {
      case "udyam_number": {
        let cleaned = v
          .replace(/\b(dash|hyphen)\b/gi, "-")
          .replace(/[^A-Za-z0-9-]/g, "")
          .toUpperCase();
        if (/^[A-Z]{2}\d{2,}\d{7}$/.test(cleaned)) {
          cleaned = `UDYAM-${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
        }
        const m = cleaned.match(/UDYAM-?([A-Z]{2})-?(\d{2})-?(\d{7})/);
        if (m) return { clean: `UDYAM-${m[1]}-${m[2]}-${m[3]}` };
        if (/UDYAM/i.test(v) && /\d{5,}/.test(v)) return { clean: v };
        return { error: "That doesn't look like a valid Udyam number. Format: UDYAM-XX-00-0000001." };
      }
      case "mobile_number": {
        const digits = v.replace(/[^0-9]/g, "");
        const mobile = digits.replace(/^(91|0)/, "");
        if (/^[6-9]\d{9}$/.test(mobile)) return { clean: mobile };
        return { error: "Please enter a valid 10-digit Indian mobile number (starting with 6-9)." };
      }
      case "pin_code": {
        const digits = v.replace(/[^0-9]/g, "");
        if (/^[1-9]\d{5}$/.test(digits)) return { clean: digits };
        return { error: "PIN code should be 6 digits (e.g., 411001)." };
      }
    }
    return { clean: v };
  }

  /* ─── Process user input ─── */
  async function processUserInput(text: string) {
    setProcessing(true);
    setOrbPhase("processing");
    const localForm: Record<string, string> = {
      ...(form as unknown as Record<string, string>),
    };

    if (!langDetectedRef.current) {
      langDetectedRef.current = true;
      const detectedLang = detectLanguage(text);
      onUpdate("language", detectedLang);
      localForm.language = detectedLang;
    }

    // Always send full text to LLM — let it extract ALL fields at once.
    // Only add single-field context when the user is answering a specific
    // follow-up question with a very short reply (< 25 chars, single field left).
    const currentKey = currentFieldRef.current;
    let enrichedText = text;
    const missingCount = getMissingFields(localForm).length;
    if (currentKey && text.length < 25 && missingCount <= 2) {
      const fieldHint = FIELD_QUESTIONS[currentKey] || currentKey;
      enrichedText = `Question: ${fieldHint}\nAnswer: ${text}`;
    }

    const { fields: extracted } = await extractFieldsFromAPI(enrichedText, localForm);
    const filledKeys: string[] = [];

    // Apply ALL LLM-extracted fields at once
    for (const [key, value] of Object.entries(extracted)) {
      if (value && !localForm[key]) {
        const result = validateField(key, value);
        if ("clean" in result) {
          onUpdate(key, result.clean);
          localForm[key] = result.clean;
          filledKeys.push(key);
        }
        // Silently skip fields that fail validation — will be re-asked
      }
    }

    // Fallback: if NER found nothing and we have a focused field, assign directly
    if (filledKeys.length === 0 && currentKey && !localForm[currentKey]) {
      const cleanText = text.trim();
      if (cleanText) {
        const result = validateField(currentKey, cleanText);
        if ("error" in result) {
          setCurrentQuestion(result.error);
          setOrbPhase("speaking");
          speak(result.error);
          setProcessing(false);
          return;
        }
        onUpdate(currentKey, result.clean);
        localForm[currentKey] = result.clean;
        filledKeys.push(currentKey);
      }
    }

    if (filledKeys.length > 0) {
      onHighlight(filledKeys);
      markRecentlyFilled(filledKeys);
    }

    // Mark first input done so askNextField can summarize remaining
    isFirstInput.current = false;

    setProcessing(false);
    setTimeout(() => askNextField(localForm), 600);
  }

  /* ─── Silence detection refs ─── */
  const silenceStartRef = useRef<number | null>(null);
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SILENCE_THRESHOLD = 10; // avg frequency value below this = silence
  const SILENCE_TIMEOUT = 5000; // 5 seconds of silence → auto-stop

  function startSilenceDetection() {
    silenceStartRef.current = null;
    silenceCheckRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;

      if (avg < SILENCE_THRESHOLD) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > SILENCE_TIMEOUT) {
          // 5 seconds of silence — auto-stop
          stopRecording();
        }
      } else {
        // Sound detected — reset silence timer
        silenceStartRef.current = null;
      }
    }, 250);
  }

  function stopSilenceDetection() {
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }
    silenceStartRef.current = null;
  }

  // Need a ref for the analyser to access from silence detection
  const analyserRef = useRef<AnalyserNode | null>(null);

  /* ─── Voice recording ─── */
  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    const wasRecording = recorder?.state === "recording";
    if (wasRecording) {
      recorder!.stop(); // triggers onstop → handleRecordingDone
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    stopAnalyzer();
    stopSilenceDetection();
    if (wasRecording) {
      setOrbPhase("processing");
    } else {
      // Recorder wasn't recording — onstop won't fire, so reset to idle
      setOrbPhase("idle");
    }
  }

  async function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!micGranted) setMicGranted(true);
        streamRef.current = stream;

        // Pick best supported MIME type
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => handleRecordingDone();
        // Collect data every 500ms for reliability
        recorder.start(500);
        mediaRecorderRef.current = recorder;
        startAnalyzer(stream);

        // Store analyser ref for silence detection
        // Access it from the audio context created by useAudioAnalyzer
        // We need to create our own analyser for silence detection
        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyserRef.current = analyser;
        } catch {
          // Silence detection won't work, but recording still does
        }

        startSilenceDetection();
        setRecording(true);
        setOrbPhase("listening");
        setLatestTranscript("");
      } catch {
        setCurrentQuestion(
          "Couldn't access your microphone. Please check browser permissions.",
        );
      }
    }
  }

  async function handleRecordingDone() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 100) {
      // Reset state so the orb becomes clickable again
      setProcessing(false);
      setOrbPhase("idle");
      setCurrentQuestion("That was too short. Tap the mic and speak for a bit longer.");
      return;
    }

    setProcessing(true);
    setOrbPhase("processing");

    try {
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      fd.append("language", "auto");
      // Tell STT what fields we're expecting so it can bias transcription
      const missingFields = getMissingFields(form as unknown as Record<string, string>);
      fd.append("field_hint", missingFields.length > 0 ? missingFields.join(",") : "general");

      const res = await fetch(`${API}/stt/transcribe`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || "").trim();

      if (data.detected_language && !langDetectedRef.current) {
        langDetectedRef.current = true;
        onUpdate("language", data.detected_language);
      }

      if (text) {
        setLatestTranscript(text);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setTranscriptHistory((prev) => [...prev, { text, time: timeStr }]);
        processUserInput(text);
      } else {
        setProcessing(false);
        setOrbPhase("idle");
        setCurrentQuestion("I couldn't catch that. Could you try again?");
      }
    } catch {
      setProcessing(false);
      setOrbPhase("idle");
      setCurrentQuestion(
        "Voice service unavailable. Please try again.",
      );
    }
  }

  /* ─── Document upload ─── */
  async function handleDocUpload(file: File) {
    setDocUploading(true);
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
        markRecentlyFilled(filledKeys);
      }

      setTimeout(() => askNextField(localForm), 600);
    } catch {
      setCurrentQuestion(
        "Couldn't read the document. Try a clearer image or type instead.",
      );
    } finally {
      setDocUploading(false);
    }
  }

  /* ─── Quick reply ─── */
  function handleQuickReply(value: string) {
    const key = currentFieldRef.current;
    if (key) {
      const localForm: Record<string, string> = {
        ...(form as unknown as Record<string, string>),
      };
      onUpdate(key, value);
      localForm[key] = value;
      onHighlight([key]);
      markRecentlyFilled([key]);
      setTimeout(() => askNextField(localForm), 400);
    }
  }

  /* ─── Drag & drop ─── */
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !isDisabled) handleDocUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!isDisabled) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  /* ─── Computed ─── */
  const activeQuickReplies =
    currentFieldRef.current
      ? getQuickReplies(currentFieldRef.current) || []
      : [];
  const isDisabled = complete || submitting;

  /* ─── Render ─── */
  return (
    <div
      className="sathi-voice-panel relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-saffron-400 to-saffron-500">
            <svg
              className="h-3 w-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-xs font-bold text-brand-900">
              Sathi
            </h3>
            <span className="text-[10px] text-surface-400">
              {filledCount}/{TOTAL_FIELDS} fields
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          <div className="flex overflow-hidden rounded-md border border-surface-200">
            {LANG_OPTIONS.map((l) => (
              <button
                key={l.code}
                onClick={() => onUpdate("language", l.code)}
                className={`px-2 py-0.5 text-[10px] font-semibold transition ${
                  form.language === l.code
                    ? "bg-brand-50 text-brand-900"
                    : "text-surface-400 hover:text-surface-600"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* TTS toggle */}
          <button
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              if (ttsEnabled) window.speechSynthesis?.cancel();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-100 text-surface-400 transition hover:bg-surface-200 hover:text-surface-600"
            title={ttsEnabled ? "Mute Sathi" : "Unmute Sathi"}
          >
            {ttsEnabled ? (
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            ) : (
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="h-0.5 bg-surface-100">
        <div
          className="h-full bg-gradient-to-r from-saffron-500 to-saffron-400 transition-all duration-500"
          style={{ width: `${(filledCount / TOTAL_FIELDS) * 100}%` }}
        />
      </div>

      {/* ─── Center content ─── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden p-3">
        <AnimatePresence mode="wait">
          {confirming && !complete ? (
            /* ─── Confirmation inline ─── */
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-sm"
            >
              <div className="space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
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
                      [
                        "Location",
                        [form.district, form.state]
                          .filter(Boolean)
                          .join(", "),
                      ],
                      ["PIN", form.pin_code],
                    ] as [string, string][]
                  ).map(([label, val]) =>
                    val ? (
                      <div
                        key={label}
                        className="flex items-start gap-2 text-xs"
                      >
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
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
                {submitting && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-saffron-500">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
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
                    Registering your business...
                  </div>
                )}
              </div>
            </motion.div>
          ) : complete ? (
            /* ─── Success inline ─── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <svg
                    className="h-5 w-5 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700">
                  MSE ID: {success}
                </p>
                <p className="mt-1 text-[11px] text-emerald-500">
                  Redirecting to classification...
                </p>
              </div>
            </motion.div>
          ) : (
            /* ─── Voice-first layout ─── */
            <motion.div
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-col items-center gap-2.5"
            >
              {/* Orb */}
              <div className="pb-1">
                <VoiceOrb
                  state={orbPhase}
                  size="sm"
                  onClick={toggleRecording}
                  disabled={
                    isDisabled || orbPhase === "speaking" || processing
                  }
                />
              </div>

              {/* Waveform */}
              <WaveformVisualizer
                frequencyData={frequencyData}
                isActive={isActive}
                bins={bins}
                variant="compact"
              />

              {/* Current question */}
              <AnimatePresence mode="wait">
                {currentQuestion && (
                  <motion.p
                    key={currentQuestion}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="max-w-xs text-center text-sm leading-relaxed text-surface-600"
                  >
                    {currentQuestion}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Live transcript — shown while listening or just finished */}
              <LiveTranscript
                text={latestTranscript}
                isListening={orbPhase === "listening"}
              />

              {/* Transcript history — persistent log of all voice inputs */}
              {transcriptHistory.length > 0 && (
                <div ref={transcriptLogRef} className="w-full max-w-md space-y-1.5 overflow-y-auto rounded-xl border border-surface-100 bg-surface-50/50 px-3 py-2" style={{ maxHeight: 120 }}>
                  {transcriptHistory.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-[10px] text-surface-400">
                        {entry.time}
                      </span>
                      <p className="text-xs leading-relaxed text-surface-600">
                        {entry.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick replies */}
              {activeQuickReplies.length > 0 && !confirming && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {activeQuickReplies.map((qr) => (
                    <button
                      key={qr.value}
                      onClick={() => handleQuickReply(qr.value)}
                      disabled={isDisabled}
                      className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-[11px] font-medium text-surface-600 transition hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 active:scale-95"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Field cards grid */}
              <div className="grid w-full grid-cols-4 gap-1">
                {FIELD_ORDER.map((key) => {
                  const val =
                    (form as unknown as Record<string, string>)[key] || "";
                  return (
                    <ExtractedFieldCard
                      key={key}
                      label={FIELD_LABELS[key] || key}
                      value={val}
                      filled={!!val.trim()}
                      recentlyFilled={recentlyFilled.includes(key)}
                    />
                  );
                })}
              </div>

              {/* Progress ring */}
              <ProgressRing filled={filledCount} total={TOTAL_FIELDS} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Drag overlay ─── */}
      {dragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/80 backdrop-blur-sm">
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="mt-2 text-sm font-medium text-brand-700">Drop PDF or Excel to extract fields</p>
          </div>
        </div>
      )}
    </div>
  );
}
