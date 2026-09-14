/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
        },
        ground: {
          dark: "var(--color-ground-dark)",
          surface: "var(--color-ground-dark-surface)",
          card: "var(--color-ground-card)",
          elevated: "var(--color-ground-elevated)",
          light: "var(--color-ground-light)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          brand: "var(--color-text-brand)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          brand: "var(--color-border-brand)",
        },
        urgency: {
          critical: "var(--color-urgency-critical)",
          soon: "var(--color-urgency-soon)",
          fresh: "var(--color-urgency-fresh)",
          frozen: "var(--color-urgency-frozen)",
        },
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
