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
        // TradingPanda design tokens — 水墨风格
        bamboo: {
          50: "#f0f9f0",
          100: "#dcf0dc",
          500: "#4a7c59",
          900: "#1a3020",
        },
        ink: {
          100: "#e8e0d8",
          500: "#5c5248",
          900: "#1a1510",
        },
        panda: {
          white: "#f5f5f0",
          black: "#1a1a1a",
        },
        emotion: {
          focused: "#4a7c59",
          excited: "#f0a500",
          greedy: "#e05500",
          cautious: "#7c7c4a",
          panicking: "#c0392b",
          numb: "#8c8c8c",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "Inter", "sans-serif"],
      },
      animation: {
        "panda-breathe": "breathe 3s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
