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

function read(key: string): string[] {
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
  const [list, setList] = useState<string[]>(() => read(key));
  useEffect(() => {
    const sync = () => setList(read(key));
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
