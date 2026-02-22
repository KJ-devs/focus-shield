import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background/index.ts"),
        popup: path.resolve(__dirname, "src/popup/index.tsx"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
