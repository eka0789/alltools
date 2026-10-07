import * as Sentry from "@sentry/nextjs";

// Edge runtime init — dynamically imported from src/instrumentation.ts
// only when a DSN is configured.

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
