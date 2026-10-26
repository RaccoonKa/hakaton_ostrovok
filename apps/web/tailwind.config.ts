import type { Config } from "tailwindcss";
import { DESIGN_TOKENS } from "@corvax/shared";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark purple header color
        header: {
          DEFAULT: "#581c87",
          hover: "#4c1675",
          dark: "#3b0764",
        },

        // Centralized tokens from @corvax/shared
        primary: DESIGN_TOKENS.colors.primary,
        secondary: DESIGN_TOKENS.colors.secondary,
        tertiary: DESIGN_TOKENS.colors.tertiary,
        canvas: DESIGN_TOKENS.colors.canvas,
        surface: DESIGN_TOKENS.colors.surface,
        content: DESIGN_TOKENS.colors.content,

        // Stitch / Warm Tech Travel Workspace tokens
        "surface-container-low": "#f6f2f7",
        "surface-container": "#f0edf1",
        "surface-container-high": "#eae7eb",
        "surface-container-highest": "#e4e1e6",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#1b1b1e",
        "on-surface-variant": "#4a4453",
        "primary-container": "#581c87",
        "on-primary-container": "#c7aaff",
        "primary-fixed": "#ebddff",
        "on-primary-fixed-variant": "#581db3",
        "secondary-container": "#d5e3fc",
        "on-secondary-fixed": "#0d1c2e",
        "tertiary-container": "#00534c",
        "tertiary-fixed": "#89f5e7",
        "outline-variant": "#ccc3d6",
      },
      borderRadius: DESIGN_TOKENS.borderRadius,
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        code: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(24, 24, 27, 0.04), 0 1px 2px rgba(24, 24, 27, 0.02)",
        "card-hover": "0 4px 12px rgba(24, 24, 27, 0.06), 0 2px 4px rgba(24, 24, 27, 0.03)",
        focus: "0 0 0 3px rgba(178, 134, 208, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
