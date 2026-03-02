import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dce4fc",
          200: "#b8c9f9",
          300: "#8aa8f4",
          400: "#5a82ed",
          500: "#1B4FCC",
          600: "#1641a8",
          700: "#113384",
          800: "#0d2664",
          900: "#0B1437",
          950: "#060a1e",
        },
        saffron: {
          50: "#fff8f0",
          100: "#ffedd4",
          200: "#ffd7a3",
          300: "#ffbc6b",
          400: "#FFA942",
          500: "#E8680C",
          600: "#c4540a",
          700: "#9e4308",
          800: "#7a3407",
          900: "#5c2705",
        },
        surface: {
          50: "#F8F9FC",
          100: "#F1F3F9",
          200: "#E4E7F1",
          300: "#D1D5E4",
          400: "#9EA5BE",
          500: "#6B7394",
          600: "#4A5170",
          700: "#343A54",
          800: "#1E2338",
          900: "#0F1220",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(27, 79, 204, 0.15)",
        "card": "0 1px 3px rgba(11, 20, 55, 0.06), 0 8px 24px rgba(11, 20, 55, 0.04)",
        "card-hover": "0 4px 12px rgba(11, 20, 55, 0.08), 0 16px 40px rgba(11, 20, 55, 0.06)",
        "elevated": "0 8px 32px rgba(11, 20, 55, 0.12)",
      },
      backgroundImage: {
        "hero-mesh": "radial-gradient(ellipse at 20% 50%, rgba(27,79,204,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(232,104,12,0.08) 0%, transparent 50%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-right": {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-width)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "chakra-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "voice-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(232, 104, 12, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(232, 104, 12, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(232, 104, 12, 0)" },
        },
        "orb-idle-pulse": {
          "0%, 100%": { boxShadow: "0 4px 24px rgba(27, 79, 204, 0.3), 0 0 0 0 rgba(27, 79, 204, 0.15)" },
          "50%": { boxShadow: "0 4px 32px rgba(27, 79, 204, 0.4), 0 0 0 12px rgba(27, 79, 204, 0)" },
        },
        "orb-listening-pulse": {
          "0%, 100%": { boxShadow: "0 4px 32px rgba(232, 104, 12, 0.4)", transform: "scale(1)" },
          "50%": { boxShadow: "0 4px 40px rgba(232, 104, 12, 0.5)", transform: "scale(1.03)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-right": "slide-right 0.8s ease-out forwards",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "chakra-spin": "chakra-spin 12s linear infinite",
        "voice-pulse": "voice-pulse 1.5s ease-in-out infinite",
        "orb-idle": "orb-idle-pulse 2.5s ease-in-out infinite",
        "orb-listening": "orb-listening-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
