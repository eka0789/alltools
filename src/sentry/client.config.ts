import * as Sentry from "@sentry/nextjs";

// Browser init — dynamically imported from src/instrumentation-client.ts
// only when NEXT_PUBLIC_SENTRY_DSN is set.

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Error replay only: no routine session recording, just the moments
  // surrounding a captured error (capped on the free tier).
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
});
