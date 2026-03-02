"use client";

import { motion } from "framer-motion";
import VoiceOrb from "./VoiceOrb";

interface PermissionGateProps {
  onGranted: (stream: MediaStream) => void;
  error: string | null;
  requesting: boolean;
  onRequest: () => void;
}

export default function PermissionGate({
  onGranted,
  error,
  requesting,
  onRequest,
}: PermissionGateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      {/* Large orb — idle, inviting */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <VoiceOrb
          state="idle"
          size="lg"
          onClick={onRequest}
          disabled={requesting}
        />
      </motion.div>

      {/* Prompt text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-sm text-center"
      >
        <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
          MSME Registration
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Sathi will guide you through voice-first registration.
          <br />
          Enable your microphone to get started.
        </p>
      </motion.div>

      {/* Enable button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        onClick={onRequest}
        disabled={requesting}
        className="btn-saffron !px-8 !py-3 !text-sm"
      >
        {requesting ? (
          <>
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
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Requesting...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
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
            </svg>
            Enable Microphone
          </>
        )}
      </motion.button>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-xs text-center text-xs text-red-400"
        >
          {error}
        </motion.p>
      )}

      {/* Skip / text-only fallback */}
      <button
        onClick={() => onGranted(null as unknown as MediaStream)}
        className="text-xs text-white/30 underline underline-offset-2 transition hover:text-white/50"
      >
        Continue without microphone
      </button>
    </div>
  );
}
