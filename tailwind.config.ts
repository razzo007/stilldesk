import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        desk: {
          bg: "var(--desk-bg)",
          surface: "var(--desk-surface)",
          border: "var(--desk-border)",
          text: "var(--desk-text)",
          muted: "var(--desk-muted)",
          soft: "var(--desk-soft)",
          accent: "var(--desk-accent)",
          accentSoft: "var(--desk-accent-soft)",
          green: "var(--desk-green)",
          greenText: "var(--desk-green-text)",
          amber: "var(--desk-amber)",
          amberText: "var(--desk-amber-text)",
          red: "var(--desk-red)",
          redText: "var(--desk-red-text)",
          blue: "var(--desk-blue)",
          blueText: "var(--desk-blue-text)",
          stone: "var(--desk-stone)",
          stoneText: "var(--desk-stone-text)",
        },
      },
      boxShadow: {
        desk: "0 18px 45px rgba(0, 0, 0, 0.22)",
        soft: "0 8px 24px rgba(0, 0, 0, 0.16)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
