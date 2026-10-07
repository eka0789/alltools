"use client";

// Tiny localStorage store with cross-component sync via a custom event.
// Powers favorites, the compare tray, and recently-viewed tools.

import { useEffect, useState } from "react";

export const FAVORITES_KEY = "alltools-favorites";
export const COMPARE_KEY = "alltools-compare";
export const RECENT_KEY = "alltools-recent";
export const STORE_EVENT = "alltools-store";

export const FAVORITES_LIMIT = 100;
export const COMPARE_LIMIT = 4;
export const RECENT_LIMIT = 12;

// Internal reader, exported for the account-sync layer (server lists merge
// into whatever is currently stored client-side).
export function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
  } catch {
    // private mode / quota — silent no-op
  }
}

function useStoredList(key: string): string[] {
  // Start empty so server and client render identical markup (reading
  // localStorage in the initializer caused hydration mismatches). The real
  // value lands right after mount via the effect below.
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setList(read(key));
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);
  return list;
}

export function useFavorites(): [string[], (slug: string) => void] {
  const list = useStoredList(FAVORITES_KEY);
  const toggle = (slug: string) => {
    const cur = read(FAVORITES_KEY);
    const next = cur.includes(slug)
      ? cur.filter((s) => s !== slug)
      : [slug, ...cur].slice(0, FAVORITES_LIMIT);
    write(FAVORITES_KEY, next);
  };
  return [list, toggle];
}

// Bulk replace (import/export). Invalid entries are dropped; the result is
// deduplicated and capped like every other write.
export function setFavorites(slugs: string[]) {
  const clean = [...new Set(slugs.filter((s) => typeof s === "string" && s.length <= 200))];
  write(FAVORITES_KEY, clean.slice(0, FAVORITES_LIMIT));
}

// Bulk replace for the compare list (account sync). Keeps insertion order,
// deduplicates, respects the 4-tool cap.
export function setCompare(slugs: string[]) {
  const clean = [...new Set(slugs.filter((s) => typeof s === "string" && s.length <= 200))];
  write(COMPARE_KEY, clean.slice(0, COMPARE_LIMIT));
}

export function useCompare(): [string[], (slug: string) => void] {
  const list = useStoredList(COMPARE_KEY);
  const toggle = (slug: string) => {
    const cur = read(COMPARE_KEY);
    const next = cur.includes(slug)
      ? cur.filter((s) => s !== slug)
      : [...cur, slug].slice(-COMPARE_LIMIT);
    write(COMPARE_KEY, next);
  };
  return [list, toggle];
}

export function useRecentlyViewed(): string[] {
  return useStoredList(RECENT_KEY);
}

export function pushRecentlyViewed(slug: string) {
  const cur = read(RECENT_KEY).filter((s) => s !== slug);
  write(RECENT_KEY, [slug, ...cur].slice(0, RECENT_LIMIT));
}
