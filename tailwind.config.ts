import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090b",
          900: "#0e1013",
          800: "#16181d",
          700: "#212429",
          600: "#33373f",
          500: "#4a4f59",
          400: "#6b707b",
          300: "#9599a3",
          200: "#c2c5cc",
          100: "#e4e5e9",
          50: "#f5f5f7",
        },
        accent: {
          600: "#3452ff",
          500: "#4f6bff",
          400: "#7188ff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "1200px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(8,9,11,0.04), 0 8px 24px -12px rgba(8,9,11,0.12)",
        cardHover: "0 2px 4px rgba(8,9,11,0.06), 0 16px 32px -12px rgba(8,9,11,0.18)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;
