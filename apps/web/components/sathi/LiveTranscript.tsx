"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LiveTranscriptProps {
  text: string;
  isListening: boolean;
  dark?: boolean;
}

export default function LiveTranscript({ text, isListening, dark }: LiveTranscriptProps) {
  if (!text && !isListening) return null;

  return (
    <div
      className={`w-full rounded-xl px-4 py-3 text-center ${
        dark ? "bg-white/5" : "bg-brand-50/60"
      }`}
    >
      <AnimatePresence mode="wait">
        {text ? (
          <motion.p
            key="text"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-sm leading-relaxed ${
              dark ? "text-white/80" : "text-brand-900"
            }`}
          >
            &ldquo;{text}&rdquo;
          </motion.p>
        ) : isListening ? (
          <motion.p
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`text-sm italic ${
              dark ? "text-white/30" : "text-surface-400"
            }`}
          >
            Listening for your voice...
          </motion.p>
        ) : null}
      </AnimatePresence>
      {isListening && (
        <div className="mt-1 flex justify-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot typing-dot-2" />
          <span className="typing-dot typing-dot-3" />
        </div>
      )}
    </div>
  );
}
