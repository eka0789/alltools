"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRecentlyViewed } from "@/lib/client-store";
import { useBulkTools } from "@/lib/use-bulk-tools";
import { ToolLogo } from "@/components/tool-logo";

// Invisible: records the current tool page as "recently viewed".
export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // dynamic import keeps this client-only module out of SSR paths
    import("@/lib/client-store").then(({ pushRecentlyViewed }) => pushRecentlyViewed(slug));
  }, [slug]);
  return null;
}

// Horizontal strip of the visitor's recently viewed tools (client-side,
// rendered from localStorage + the bulk API).
export function RecentlyViewedStrip({ exclude }: { exclude?: string }) {
  const slugs = useRecentlyViewed().filter((s) => s !== exclude).slice(0, 6);
  const { tools, loading } = useBulkTools(slugs);

  if (!loading && tools.length === 0) return null;

  return (
    <section aria-label="Recently viewed tools" className="mt-10">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Recently viewed</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-16 animate-pulse bg-muted/40" />
            ))
          : tools.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="card flex items-center gap-3 p-3 transition-colors hover:border-accent/40"
              >
                <ToolLogo url={t.url} name={t.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.categoryName}
                  </span>
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}
