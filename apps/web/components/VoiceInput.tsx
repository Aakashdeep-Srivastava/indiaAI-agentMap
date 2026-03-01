"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type VoiceState = "idle" | "recording" | "processing";

interface VoiceInputProps {
  language: string;
  fieldLabel: string;
  onTranscribe: (text: string) => void;
  disabled?: boolean;
}

const MAX_DURATION_MS = 30_000;

export default function VoiceInput({
  language,
  fieldLabel,
  onTranscribe,
  disabled = false,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fieldHint = fieldLabel.toLowerCase().includes("name")
    ? "name"
    : fieldLabel.toLowerCase().includes("product")
      ? "products"
      : "description";

  const getMimeType = useCallback((): string => {
    if (typeof MediaRecorder === "undefined") return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "audio/webm";
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Microphone not supported in this browser");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission denied");
      return;
    }

    const mimeType = getMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("processing");

      const blob = new Blob(chunksRef.current, { type: mimeType });

      try {
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        formData.append("language", language);
        formData.append("field_hint", fieldHint);

        const res = await fetch(`${API}/stt/transcribe`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Transcription failed");

        const data = await res.json();
        onTranscribe(data.text);
      } catch {
        setError("Could not transcribe audio. Please try again.");
      } finally {
        setState("idle");
      }
    };

    recorder.start();
    setState("recording");

    timerRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_DURATION_MS);
  }, [language, fieldHint, getMimeType, onTranscribe, stopRecording]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  }, [state, disabled, startRecording, stopRecording]);

  return (
    <div className="relative flex flex-col items-center gap-1">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "processing"}
        whileTap={state === "idle" ? { scale: 0.92 } : undefined}
        className={`voice-btn ${
          state === "idle"
            ? "voice-btn-idle"
            : state === "recording"
              ? "voice-btn-recording"
              : "voice-btn-processing"
        }`}
        title={
          state === "idle"
            ? `Speak ${fieldLabel}`
            : state === "recording"
              ? "Stop recording"
              : "Processing..."
        }
      >
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.svg
              key="mic"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </motion.svg>
          )}
          {state === "recording" && (
            <motion.svg
              key="stop"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </motion.svg>
          )}
          {state === "processing" && (
            <motion.svg
              key="spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-5 w-5 animate-spin"
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
            </motion.svg>
          )}
        </AnimatePresence>

        {state === "recording" && (
          <span className="voice-pulse-ring" />
        )}
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute -bottom-6 whitespace-nowrap text-[10px] font-medium text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
