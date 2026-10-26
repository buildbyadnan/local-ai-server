import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests cover the pure helpers only (CONNECTIVITY_PLAN §10.3): tag
 * validation, NDJSON buffering/parsing, session filtering, install
 * matching. No framework or browser tests — the manual matrix in §10.5
 * owns integration, and CI has no browser.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
