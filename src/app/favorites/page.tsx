"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { useFavorites, useRecentlyViewed, setFavorites, FAVORITES_LIMIT } from "@/lib/client-store";
import { useBulkTools, type BulkTool } from "@/lib/use-bulk-tools";
import { ToolLogo } from "@/components/tool-logo";
import { PricingBadge } from "@/components/tool-card";
import { FavoriteButton } from "@/components/favorite-button";
import { RecentlyViewedStrip } from "@/components/recently-viewed";

function ToolRow({ tool }: { tool: BulkTool }) {
  return (
    <div className="card flex items-center gap-3 p-3 transition-colors hover:border-accent/40">
      <ToolLogo url={tool.url} name={tool.name} size="md" />
      <Link href={`/tools/${tool.slug}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{tool.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {tool.categoryName} — {tool.description}
        </span>
      </Link>
      <PricingBadge pricing={tool.pricing} />
      <FavoriteButton slug={tool.slug} name={tool.name} />
    </div>
  );
}

export default function FavoritesPage() {
  const [favorites, toggle] = useFavorites();
  const recent = useRecentlyViewed();
  const { tools, loading } = useBulkTools(favorites);
  const ordered = favorites
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is BulkTool => !!t);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Shortlists are device-local by design — export/import is the
  // no-account way to move them between browsers or back them up.
  function exportFavorites() {
    const blob = new Blob(
      [JSON.stringify({ app: "alltools", version: 1, favorites }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alltools-favorites.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFavorites(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text());
      const list = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { favorites?: unknown }).favorites)
          ? (data as { favorites: unknown[] }).favorites
          : null;
      if (!list) {
        setImportMsg("That file doesn't look like an AllTools favorites export.");
        return;
      }
      const imported = list.filter((s): s is string => typeof s === "string");
      const merged = [...new Set([...favorites, ...imported])].slice(0, FAVORITES_LIMIT);
      setFavorites(merged);
      setImportMsg(
        `Imported ${imported.length} entr${imported.length === 1 ? "y" : "ies"} — shortlist now holds ${merged.length}.`,
      );
    } catch {
      setImportMsg("Couldn't read that file.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Heart className="h-6 w-6 text-accent" />
            Your shortlist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved locally in this browser — no account needed.
          </p>
        </div>
        {favorites.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button type="button" onClick={exportFavorites} className="btn-secondary !py-1.5 text-xs">
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="btn-secondary !py-1.5 text-xs"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => favorites.forEach(toggle)}
              className="btn-secondary !py-1.5 text-xs"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          </div>
        )}
      </header>

      {importMsg && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          {importMsg}
        </p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFavorites(file);
          e.target.value = "";
        }}
      />

      <div className="mt-8 space-y-3">
        {favorites.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Heart className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Nothing saved yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tap the heart on any tool card to keep it here for later.
              </p>
            </div>
            <Link href="/tools" className="btn-primary mt-2">
              Browse all tools
            </Link>
          </div>
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-muted/40" />
          ))
        ) : (
          ordered.map((tool) => <ToolRow key={tool.slug} tool={tool} />)
        )}
      </div>

      {recent.length > 0 && <RecentlyViewedStrip />}
    </div>
  );
}
