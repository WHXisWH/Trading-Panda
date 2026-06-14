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
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#0f973d",
          600: "#0a7a31",
          900: "#064e1b",
        },
        neutral: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          500: "#6b7280",
          700: "#374151",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      spacing: {
        navbar: "var(--navbar-height)",
        sidebar: "var(--sidebar-width)",
      },
      maxWidth: {
        page: "var(--page-max-width)",
        mint: "var(--page-mint-max-width)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        accent: "var(--shadow-accent)",
        "accent-lg": "var(--shadow-accent-lg)",
      },
      backgroundImage: {
        brand: "var(--gradient-brand)",
        "brand-soft": "var(--gradient-brand-soft)",
        "dark-panel": "var(--gradient-dark-panel)",
        hero: "var(--gradient-hero)",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
