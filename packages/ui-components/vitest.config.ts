import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 65 },
    },
  },
});
