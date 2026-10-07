import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Force the bundled-JSON catalog path: pointing ALLTOOLS_DB at the
    // repo root (a directory) makes the SQLite open fail, so the catalog
    // is served from catalog.generated.json — tests stay hermetic and
    // independent of any local dev database state.
    env: {
      ALLTOOLS_DB: ".",
    },
  },
});
