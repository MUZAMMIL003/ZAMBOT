import type { Config } from "tailwindcss";

/**
 * Clean light theme config for ChatEase.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        ink: {
          1000: "#F2F4F7", // Very light for active row bg
          950: "#F6F7F9", // page bg
          900: "#F9FAFB", // raised
          850: "#FFFFFF", // card/surface
          800: "#E5E7EB", // row / control / border
          700: "#D1D5DB",
          600: "#9CA3AF",
          500: "#6B7280",
          400: "#4B5563",
          300: "#374151",
          200: "#1F2937",
          100: "#111827",
          50: "#000000",
        },
        // The single accent.
        volt: {
          DEFAULT: "#000000",
          bright: "#404040",
          soft: "#737373",
          deep: "#000000",
        },
        positive: "#34D399",
        caution: "#FBBF24",
        danger: "#F87171",
      },
      borderRadius: {
        row: "16px",
        card: "20px",
        sheet: "28px",
        pill: "999px",
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        hero: ["clamp(2rem, 8.5vw, 3.75rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        display: ["clamp(1.6rem, 4vw, 2.5rem)", { lineHeight: "1.12", letterSpacing: "-0.025em" }],
      },
      boxShadow: {
        row: "0 1px 0 rgba(0,0,0,0.03) inset",
        card: "0 4px 20px rgba(0,0,0,0.05)",
        volt: "0 8px 28px rgba(0,0,0,0.15)",
        "volt-lg": "0 12px 40px rgba(0,0,0,0.2)",
        lifted: "0 24px 64px rgba(0,0,0,0.1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        // The orb's slow internal rotation.
        "orb-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "orb-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-2%,0) scale(1.04)" },
        },
        // Aurora wisps breathing at the edges of the screen.
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.55" },
          "33%": { transform: "translate3d(4%,-3%,0) scale(1.12)", opacity: "0.8" },
          "66%": { transform: "translate3d(-3%,3%,0) scale(0.95)", opacity: "0.6" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.06)" },
        },
        caret: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "listen-ring": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s infinite",
        "orb-spin": "orb-spin 26s linear infinite",
        "orb-drift": "orb-drift 9s ease-in-out infinite",
        aurora: "aurora 22s ease-in-out infinite",
        "pulse-soft": "pulse-soft 4s ease-in-out infinite",
        caret: "caret 1s step-end infinite",
        "listen-ring": "listen-ring 2.4s cubic-bezier(0.22,1,0.36,1) infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
