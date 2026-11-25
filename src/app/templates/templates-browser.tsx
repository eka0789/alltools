"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Search, Unlock, X } from "lucide-react";

export interface TemplateCardItem {
  slug: string;
  name: string;
  tagline: string;
  tags: string[];
  priceIdr: number;
  compareAtPriceIdr?: number;
  discountPct: number | null;
  priceFormatted: string;
  compareAtFormatted: string | null;
  unlocked: boolean;
}

type TierFilter = "all" | "free" | "premium";

export function TemplatesBrowser({ items }: { items: TemplateCardItem[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const freeCount = useMemo(() => items.filter((i) => i.priceIdr === 0).length, [items]);
  const premiumCount = items.length - freeCount;

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const t of item.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tier === "free" && item.priceIdr > 0) return false;
      if (tier === "premium" && item.priceIdr === 0) return false;
      if (selectedTag && !item.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, tier, selectedTag]);

  const hasFilters = Boolean(query.trim() || tier !== "all" || selectedTag);

  return (
    <div className="mt-8 space-y-5">
      {/* Search + Tier Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari template (mis. SaaS, Laravel, Next.js)…"
            aria-label="Cari template"
            className="input !pl-9 !py-2 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
          {(
            [
              { id: "all", label: `Semua (${items.length})` },
              { id: "free", label: `Gratis (${freeCount})` },
              { id: "premium", label: `Premium (${premiumCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTier(tab.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tier === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stack / Tag filter chips */}
      {topTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`chip ${selectedTag === null ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
          >
            Semua stack
          </button>
          {topTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`chip ${selectedTag === tag ? "!border-accent !bg-accent-soft !text-accent" : ""}`}
            >
              {tag}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium">Tidak ada template yang cocok dengan filter ini.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Coba kata kunci lain atau bersihkan filter aktif.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTier("all");
                setSelectedTag(null);
              }}
              className="btn-secondary mt-4 !py-1.5 text-xs"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="card flex flex-col p-6 transition-colors hover:border-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{t.name}</h2>
                {t.priceIdr === 0 ? (
                  <Unlock className="h-4 w-4 shrink-0 text-success" aria-label="Gratis" />
                ) : t.unlocked ? (
                  <Unlock className="h-4 w-4 shrink-0 text-accent" aria-label="Anda punya akses" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Premium" />
                )}
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                {t.tagline}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {t.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold">{t.priceFormatted}</span>
                {t.compareAtFormatted && t.discountPct && (
                  <>
                    <span className="text-xs text-muted-foreground line-through">
                      {t.compareAtFormatted}
                    </span>
                    <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      -{t.discountPct}%
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
