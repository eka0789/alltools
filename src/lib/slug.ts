export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Whole months elapsed since `ms` (clamped at 0). Coarse on purpose — used
// for the maintenance-freshness signal, not precise scheduling.
export function monthsSince(ms: number, now: number): number {
  if (!ms || ms > now) return 0;
  const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
  return Math.floor((now - ms) / MONTH_MS);
}

// Locale pinned to en-US everywhere: toLocaleString() without a locale
// differs between server and browser and trips hydration mismatches.
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatNumberExact(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
