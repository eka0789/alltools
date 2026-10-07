// Client-side instrumentation (see docs: instrumentation-client file
// convention). Runs before the app becomes interactive.

// Initialize Sentry only when configured — NEXT_PUBLIC_* is inlined at
// build time, so unconfigured deploys dead-code-eliminate the import.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("./sentry/client.config");
}

// Router navigation spans for Sentry tracing (no-op until the client SDK
// initializes itself).
export async function onRouterTransitionStart(
  ...args: Parameters<
    typeof import("@sentry/nextjs").captureRouterTransitionStart
  >
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const { captureRouterTransitionStart } = await import("@sentry/nextjs");
  captureRouterTransitionStart(...args);
}
