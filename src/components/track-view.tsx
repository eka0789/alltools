"use client";

import { useEffect, useRef } from "react";

// Impression beacon. Runs on real page loads (client only), so ISR/SSR
// prefetches never inflate the counter. A ref guards React StrictMode's
// double-invoked effects in development.
export function TrackView({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const payload = JSON.stringify({ slug });
    try {
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/track-view",
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
    } catch {
      // fall back to fetch
    }
    void fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [slug]);

  return null;
}
