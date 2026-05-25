import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f5f0e6",
          card: "#ede8dc",
        },
        bamboo: {
          50: "#f0f8f0",
          100: "#dcf0dc",
          500: "#2d5a3d",
          600: "#1e4a2e",
          900: "#1a3020",
        },
        ink: {
          100: "#e8e0d8",
          500: "#888888",
          900: "#1a1a1a",
        },
        panda: {
          white: "#f5f5f0",
          black: "#1a1a1a",
        },
        vermillion: "#c23a3a",
        rouge: "#d4727a",
        gold: "#c8a432",
        emotion: {
          focused: "#2d5a3d",
          excited: "#d4727a",
          greedy: "#c8a432",
          cautious: "#4a6d8c",
          panicking: "#95a5a6",
          numb: "#bdc3c7",
          calm: "#2d5a3d",
          frustrated: "#c23a3a",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Inter", "monospace"],
      },
      spacing: {
        navbar: "var(--navbar-height)",
        sidebar: "var(--sidebar-width)",
        "sidebar-wide": "var(--sidebar-width-wide)",
        decision: "var(--decision-panel-width)",
      },
      maxWidth: {
        page: "var(--page-max-width)",
        mint: "var(--page-mint-max-width)",
        modal: "var(--modal-width-lg)",
        "modal-sm": "var(--modal-width-sm)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
        decision: "var(--decision-panel-width)",
      },
      borderRadius: {
        paper: "12px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(45, 90, 61, 0.2)",
        "glow-rare": "0 0 40px rgba(232, 184, 75, 0.35)",
      },
      animation: {
        "panda-breathe": "breathe 3s ease-in-out infinite",
        "scale-in": "scaleIn 200ms ease-out forwards",
        "spring-up": "springUp 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        springUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(232, 184, 75, 0.3)" },
          "50%": { boxShadow: "0 0 28px rgba(232, 184, 75, 0.55)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
