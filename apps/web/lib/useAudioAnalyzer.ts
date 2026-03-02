"use client";

import { useRef, useState, useCallback } from "react";

const FFT_SIZE = 64;
const BINS = 24;

export function useAudioAnalyzer() {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(
    new Uint8Array(BINS),
  );
  const [isActive, setIsActive] = useState(false);

  const tick = useCallback(() => {
    if (!analyserRef.current) return;
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(buf);
    // Take first BINS values (low-to-mid frequencies, most useful for voice)
    setFrequencyData(buf.slice(0, BINS));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.7;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        ctxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        setIsActive(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Web Audio not supported — silently degrade
      }
    },
    [tick],
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.disconnect();
    ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    setIsActive(false);
    setFrequencyData(new Uint8Array(BINS));
  }, []);

  return { start, stop, frequencyData, isActive, bins: BINS };
}
