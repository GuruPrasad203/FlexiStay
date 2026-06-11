import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Vitest config — unit and component tests.
 *
 * Run:  npm test          → runs all tests once
 *       npm run test:ui   → opens browser UI with live results
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom to simulate a browser environment
    environment: "jsdom",

    // Auto-import expect, describe, it etc. — no imports needed in test files
    globals: true,

    // Run this file before each test file — sets up jest-dom matchers
    setupFiles: ["./src/test/setup.ts"],

    // Coverage settings
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.config.*",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
