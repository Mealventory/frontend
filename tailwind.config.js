/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          surface: "var(--color-brand-surface)",
        },
        ground: {
          input: "var(--color-ground-input)",
          canvas: "var(--color-ground-canvas)",
          surface: "var(--color-ground-surface)",
          card: "var(--color-ground-card)",
          elevated: "var(--color-ground-elevated)",
          subtle: "var(--color-ground-subtle)",
          muted: "var(--color-ground-muted)",
          dark: "var(--color-ground-dark)",
          light: "var(--color-ground-light)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
          brand: "var(--color-text-brand)",
          inverse: "var(--color-text-inverse)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          brand: "var(--color-border-brand)",
        },
        urgency: {
          critical: "var(--color-urgency-critical)",
          "critical-bg": "var(--color-urgency-critical-bg)",
          soon: "var(--color-urgency-soon)",
          "soon-bg": "var(--color-urgency-soon-bg)",
          fresh: "var(--color-urgency-fresh)",
          "fresh-bg": "var(--color-urgency-fresh-bg)",
          frozen: "var(--color-urgency-frozen)",
          "frozen-bg": "var(--color-urgency-frozen-bg)",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        regular: ["var(--font-regular)"],
        semibold: ["var(--font-semibold)"],
        bold: ["var(--font-bold)"],
      },
    },
  },
  plugins: [],
};
