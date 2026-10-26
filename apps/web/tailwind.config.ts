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
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(24, 24, 27, 0.04), 0 1px 2px rgba(24, 24, 27, 0.02)",
        "card-hover": "0 4px 12px rgba(24, 24, 27, 0.06), 0 2px 4px rgba(24, 24, 27, 0.03)",
        focus: "0 0 0 3px rgba(84, 56, 220, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
