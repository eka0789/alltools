import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel/serverless: bake the seeded SQLite database into every traced
  // serverless bundle so the catalog is available at runtime (read-only).
  // "/**" already covers every route — per-route entries are redundant.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

// Sourcemap upload + build instrumentation only activate when Sentry env
// vars are present (SENTRY_AUTH_TOKEN etc.); without them this wrapper is
// inert and the build produces exactly the previous output.
export default withSentryConfig(nextConfig, {
  // Picked up from the environment by the Sentry CLI at build time.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Skip sourcemap upload (and its cost) until a token exists.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: true,
  telemetry: false,
});
