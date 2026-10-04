"use client";

import { useEffect } from "react";

// Registers the service worker (PWA offline support) in production only —
// dev servers and SW don't mix well (stale chunks during hot reloads).
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Activate updated workers immediately instead of waiting for
          // every tab to close.
          reg.addEventListener("updatefound", () => {
            const next = reg.installing;
            next?.addEventListener("statechange", () => {
              if (next.state === "installed" && navigator.serviceWorker.controller) {
                next.postMessage("skip-waiting");
              }
            });
          });
        })
        .catch(() => {
          // offline support is progressive — registration failures are silent
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
