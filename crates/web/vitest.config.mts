import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests cover the pure helpers and static data only: tag validation,
 * NDJSON buffering/parsing, session filtering, install matching,
 * guide-data integrity. No framework or browser tests — the CDP matrices
 * (run by hand against a local build) own integration, and CI has no browser.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "data/**/*.test.ts"],
    environment: "node",
  },
});
