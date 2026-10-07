import * as Sentry from "@sentry/nextjs";

// Node.js server init — dynamically imported from src/instrumentation.ts
// only when a DSN is configured, so unconfigured deploys never load the SDK.

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Free-tier-friendly: sample a fraction of spans.
  tracesSampleRate: 0.1,
});
