"use client";

import Link from "next/link";
import { useEffect } from "react";

// Root error boundary. Note: Next 16 error boundaries expose `retry`
// (formerly `reset`).
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Route errors also surface in Sentry via instrumentation's
  // onRequestError for server-side throws; this covers client-side ones.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then(({ captureException }) =>
      captureException(error),
    );
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        An unexpected error occurred while rendering this page. It has been
        logged{error.digest ? ` (ref: ${error.digest})` : ""}.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={retry} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}
