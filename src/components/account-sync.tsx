"use client";

import { useEffect } from "react";
import { FAVORITES_KEY, COMPARE_KEY, read, setFavorites, setCompare, STORE_EVENT } from "@/lib/client-store";

// Cross-device sync for signed-in users. Local-first: localStorage stays the
// source of truth for rendering; this component merges the server's lists in
// on load and pushes local changes (debounced) whenever they change. No-op
// when signed out — the page renders identically either way.
export function AccountSync() {
  useEffect(() => {
    let authed = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    let syncing = false;

    const push = () => {
      if (!authed || syncing) return;
      pushTimer = null;
      fetch("/api/sync/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favorites: read(FAVORITES_KEY),
          compare: read(COMPARE_KEY),
        }),
        keepalive: true,
      }).catch(() => {
        // offline — the next change (or online event) retries
      });
    };

    const schedulePush = () => {
      if (!authed || pushTimer) return;
      pushTimer = setTimeout(push, 1500);
    };

    const pullAndMerge = async () => {
      syncing = true;
      try {
        const res = await fetch("/api/sync/lists", { cache: "no-store" });
        if (res.status === 401) return;
        if (!res.ok) return;
        authed = true;
        const data = (await res.json()) as { favorites?: string[]; compare?: string[] };

        // Union merge: local order first (what the user sees), remote entries
        // appended so nothing saved on another device is lost.
        const localFav = read(FAVORITES_KEY);
        const mergedFav = [...new Set([...localFav, ...(data.favorites ?? [])])].slice(0, 100);
        if (mergedFav.join(",") !== localFav.join(",")) setFavorites(mergedFav);

        const localCmp = read(COMPARE_KEY);
        const mergedCmp = [...new Set([...localCmp, ...(data.compare ?? [])])].slice(0, 4);
        if (mergedCmp.join(",") !== localCmp.join(",")) setCompare(mergedCmp);
      } catch {
        // offline — try again on the next online event
      } finally {
        syncing = false;
      }
    };

    void pullAndMerge();

    window.addEventListener(STORE_EVENT, schedulePush);
    window.addEventListener("storage", schedulePush);
    window.addEventListener("online", () => void pullAndMerge());
    return () => {
      window.removeEventListener(STORE_EVENT, schedulePush);
      window.removeEventListener("storage", schedulePush);
      if (pushTimer) clearTimeout(pushTimer);
    };
  }, []);
  return null;
}
