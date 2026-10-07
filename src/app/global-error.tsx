"use client";

import { useEffect } from "react";

// Last-chance boundary for errors thrown outside route-level boundaries
// (root layout itself). Renders its own <html>/<body>; captures the error
// to Sentry when configured, otherwise just logs for the server console.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then(({ captureException }) =>
      captureException(error),
    );
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0c",
          color: "#fafafa",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.7, fontSize: "0.875rem", marginTop: "0.5rem" }}>
            A critical error occurred. It has been logged
            {error.digest ? ` (ref: ${error.digest})` : ""}.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "#fafafa",
              color: "#0a0a0c",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
