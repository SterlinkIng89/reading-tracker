/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ==================== TEXT COLORS ====================
        // Main text colors
        primary: "rgb(var(--color-text-primary) / <alpha-value>)", // Paragraph base (#E5E7EB)
        secondary: "rgb(var(--color-text-secondary) / <alpha-value>)", // Lower hierarchy text (#A8A8A9)
        tertiary: "rgb(var(--color-text-tertiary) / <alpha-value>)", // Secondary text (#A8A8A9)
        highlight: "rgb(var(--color-text-highlight) / <alpha-value>)", // Titles and highlighted text (#FFFFFF)

        // Accent colors and hover states
        accent: "rgb(var(--color-text-accent) / <alpha-value>)", // Navy Blue Base (#1E88E5)
        "accent-hover": "rgb(var(--color-text-accent-hover) / <alpha-value>)", // Light Blue Hover (#42A5F5)

        // Hover mappings for text (if needed directly)
        "primary-hover": "rgb(var(--color-text-primary-hover) / <alpha-value>)",
        "secondary-hover":
          "rgb(var(--color-text-secondary-hover) / <alpha-value>)",

        // ==================== SURFACES / BACKGROUNDS ====================
        // Surface hierarchy
        "bg-base": "rgb(var(--color-bg-base) / <alpha-value>)", // #121212 (Main background)
        "surface-low": "rgb(var(--color-surface-low) / <alpha-value>)", // #1F2124 (Header/Footer, low elevation)
        "surface-medium": "rgb(var(--color-surface-medium) / <alpha-value>)", // #2A2A2A (Cards/Panels, medium elevation)
        "surface-high": "rgb(var(--color-surface-high) / <alpha-value>)", // #3B3B3B (Modals/Popups, high elevation)

        // ==================== ACCENT & BUTTONS ====================
        // Button and interactive element colors
        "accent-base": "rgb(var(--color-accent-base) / <alpha-value>)", // Main Navy Blue (#1E88E5)
        "accent-dark": "rgb(var(--color-accent-dark) / <alpha-value>)", // Dark Navy Blue (Primary button background) (#1565C0)
        "accent-hover": "rgb(var(--color-accent-hover) / <alpha-value>)", // Light Blue for Hover (#42A5F5)
        "accent-light": "rgb(var(--color-accent-light) / <alpha-value>)", // Lighter Blue for Hover (#42A5F5)
        "accent-shadow": "rgb(var(--color-accent-shadow) / <alpha-value>)", // Shadow color for accent buttons

        "btn-secondary-base":
          "rgb(var(--color-btn-secondary-base) / <alpha-value>)", // Texto Link Secundario (#A3C3E3)
        "btn-secondary-hover-bg":
          "rgb(var(--color-btn-secondary-hover-bg) / <alpha-value>)", // Hover BG para Secundario (#003566)
        "btn-tertiary-bg": "rgb(var(--color-btn-tertiary-bg) / <alpha-value>)", // Fondo Botón Neutro (#2F333B)
        "btn-tertiary-hover-bg":
          "rgb(var(--color-btn-tertiary-hover-bg) / <alpha-value>)", // Hover BG para Neutro (#404040)

        // ==================== UTILITY / SEMANTIC ====================
        // Functional colors
        success: "rgb(var(--color-success) / <alpha-value>)", // Green (#4CAF50)
        danger: "rgb(var(--color-danger) / <alpha-value>)", // Red (#B71C1C)
        warning: "rgb(var(--color-warning) / <alpha-value>)", // Yellow/Amber (#FFC107)

        // ==================== BORDERS / DIVIDERS ====================
        // Lines and borders
        "border-default": "rgb(var(--color-border-default) / <alpha-value>)", // Subtle Gray (#404040)
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)", // Strong Gray (#535151)

        // ==================== INPUTS & FORMS ====================
        "input-bg": "rgb(var(--color-input-bg) / <alpha-value>)",
        "input-border": "rgb(var(--color-input-border) / <alpha-value>)",
        "input-placeholder":
          "rgb(var(--color-input-placeholder) / <alpha-value>)",

        // Estados
        "input-focus-border":
          "rgb(var(--color-input-focus-border) / <alpha-value>)",
        "input-error-border":
          "rgb(var(--color-input-error-border) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
