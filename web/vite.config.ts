import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const api = `http://localhost:${process.env.API_PORT ?? "4000"}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": api,
      "/health": api,
      "/ws": { target: api, ws: true },
    },
  },
});
