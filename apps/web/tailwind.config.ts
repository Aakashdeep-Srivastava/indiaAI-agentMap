import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Government of India theme palette
        saffron: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        navy: {
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#1e3a5f",
          700: "#172554",
          800: "#0f1d3d",
          900: "#0a1628",
        },
        ashoka: {
          500: "#1e40af", // Ashoka Chakra blue
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Devanagari", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
