import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "^/(health|agui|info|stream|travel|travel_agent|auth)": {
        target: process.env.VITE_BACKEND_URL || "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
