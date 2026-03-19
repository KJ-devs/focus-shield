import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const isMockTauri = process.env.TAURI_MOCK === "true";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(isMockTauri
        ? {
            "@tauri-apps/api/core": path.resolve(__dirname, "./src/test/mock-tauri-core.ts"),
            "@tauri-apps/api/event": path.resolve(__dirname, "./src/test/mock-tauri-event.ts"),
          }
        : {}),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
