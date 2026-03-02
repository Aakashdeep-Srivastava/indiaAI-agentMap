"use client";

type WaveformVariant = "compact" | "wide";

const HEIGHT_MAP: Record<WaveformVariant, number> = { compact: 48, wide: 80 };

interface WaveformVisualizerProps {
  frequencyData: Uint8Array;
  isActive: boolean;
  bins: number;
  variant?: WaveformVariant;
}

export default function WaveformVisualizer({
  frequencyData,
  isActive,
  bins,
  variant = "compact",
}: WaveformVisualizerProps) {
  const maxH = HEIGHT_MAP[variant];

  return (
    <div
      className="flex items-end justify-center gap-[3px]"
      style={{ height: maxH }}
    >
      {Array.from({ length: bins }, (_, i) => {
        const value = frequencyData[i] ?? 0;
        const h = isActive ? Math.max(4, (value / 255) * maxH) : 4;
        return (
          <div
            key={i}
            className={`waveform-bar ${isActive ? "waveform-bar-active" : "waveform-bar-idle"}`}
            style={{
              height: `${h}px`,
              width: variant === "wide" ? "4px" : "3px",
            }}
          />
        );
      })}
    </div>
  );
}
