import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand header color
        header: {
          DEFAULT: "#a758cc",
          hover: "#9544b8",
          dark: "#8433a5",
        },

        // Stitch / Warm Tech Travel Workspace tokens
        "surface-container-low": "#f6f2f7",
        "surface-container": "#f0edf1",
        "surface-container-high": "#eae7eb",
        "surface-container-highest": "#e4e1e6",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#1b1b1e",
        "on-surface-variant": "#4a4453",
        "primary-container": "#5b21b6",
        "on-primary-container": "#c7aaff",
        "primary-fixed": "#ebddff",
        "on-primary-fixed-variant": "#581db3",
        "secondary-container": "#d5e3fc",
        "on-secondary-fixed": "#0d1c2e",
        "tertiary-container": "#00534c",
        "tertiary-fixed": "#89f5e7",
        "outline-variant": "#ccc3d6",

        // Foundation colors
        primary: {
          DEFAULT: "#5438DC",
          hover: "#4328CA",
          light: "#F0EDFD",
        },
        secondary: {
          DEFAULT: "#FF7A30",
          hover: "#E86922",
          light: "#FFF4EE",
        },
        tertiary: {
          DEFAULT: "#22C55E",
          light: "#ECFDF5",
        },
        canvas: "#FBFBFD",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F4F6",
          subtle: "#EEEEF2",
          border: "#E5E5EB",
        },
        content: {
          primary: "#18181B",
          secondary: "#3F3F46",
          muted: "#71717A",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        code: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(24, 24, 27, 0.04), 0 1px 2px rgba(24, 24, 27, 0.02)",
        "card-hover": "0 4px 12px rgba(24, 24, 27, 0.06), 0 2px 4px rgba(24, 24, 27, 0.03)",
        focus: "0 0 0 3px rgba(167, 88, 204, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
