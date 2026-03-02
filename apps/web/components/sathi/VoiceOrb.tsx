"use client";

import { motion } from "framer-motion";

type OrbState = "idle" | "listening" | "processing" | "speaking";
type OrbSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<OrbSize, number> = { sm: 120, md: 200, lg: 250 };
const ICON_MAP: Record<OrbSize, string> = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-16 w-16" };

interface VoiceOrbProps {
  state: OrbState;
  onClick: () => void;
  disabled?: boolean;
  size?: OrbSize;
}

export default function VoiceOrb({
  state,
  onClick,
  disabled,
  size = "sm",
}: VoiceOrbProps) {
  const px = SIZE_MAP[size];
  const iconClass = ICON_MAP[size];

  const stateClass =
    state === "listening"
      ? "voice-orb-listening"
      : state === "processing"
        ? "voice-orb-processing"
        : state === "speaking"
          ? "voice-orb-speaking"
          : "voice-orb-idle";

  return (
    <div className="relative flex items-center justify-center">
      {/* Expanding rings */}
      {state === "listening" && (
        <>
          <span
            className="orb-ring orb-ring-listening absolute rounded-full"
            style={{ width: px, height: px }}
          />
          <span
            className="orb-ring orb-ring-listening absolute rounded-full"
            style={{ width: px, height: px, animationDelay: "0.5s" }}
          />
        </>
      )}
      {state === "speaking" && (
        <>
          <span
            className="orb-ring orb-ring-speaking absolute rounded-full"
            style={{ width: px, height: px }}
          />
          <span
            className="orb-ring orb-ring-speaking absolute rounded-full"
            style={{ width: px, height: px, animationDelay: "0.7s" }}
          />
        </>
      )}
      {state === "idle" && (
        <span
          className="orb-ring absolute rounded-full"
          style={{
            width: px,
            height: px,
            borderColor: "rgba(27,79,204,0.2)",
          }}
        />
      )}

      <motion.button
        onClick={onClick}
        disabled={disabled || state === "processing"}
        whileTap={{ scale: 0.93 }}
        className={`voice-orb ${stateClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ width: px, height: px }}
        aria-label={
          state === "listening"
            ? "Stop recording"
            : state === "processing"
              ? "Processing..."
              : state === "speaking"
                ? "Sathi is speaking"
                : "Tap to speak"
        }
      >
        {state === "processing" ? (
          <svg
            className={`${iconClass} animate-spin text-white/80`}
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
        ) : state === "speaking" ? (
          /* Sound wave icon for speaking */
          <svg
            className={`${iconClass} text-white`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
          </svg>
        ) : (
          /* Microphone icon */
          <svg
            className={`${iconClass} text-white`}
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
        )}
      </motion.button>

      {/* Label below */}
      <motion.p
        key={state}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-8 whitespace-nowrap text-xs font-medium text-surface-500"
      >
        {state === "listening"
          ? "Listening... tap to stop"
          : state === "processing"
            ? "Understanding..."
            : state === "speaking"
              ? "Sathi is speaking..."
              : "Tap to speak"}
      </motion.p>
    </div>
  );
}
