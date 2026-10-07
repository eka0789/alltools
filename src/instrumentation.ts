import type { Instrumentation } from "next";

// Server-side observability hook (see docs: instrumentation file convention).
// Everything is opt-in: without SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN set, no
// SDK is imported and the app runs exactly as before.

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry/server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry/edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  await captureRequestError(...args);
};
