import Link from "next/link";
import { SearchX } from "lucide-react";
import type { ToolWithMeta } from "@/lib/data";
import { ToolCard } from "./tool-card";
import { buildHref, type BrowserSearchParams } from "./filters";

export function Pagination({
  params,
  basePath,
  page,
  totalPages,
}: {
  params: BrowserSearchParams;
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - window && i <= page + window)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={buildHref(params, { page: String(page - 1) }, basePath)} className="btn-secondary !px-3 !py-1.5 text-xs">
          Previous
        </Link>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(params, { page: String(p) }, basePath)}
            aria-current={p === page ? "page" : undefined}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs transition-colors ${
              p === page
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={buildHref(params, { page: String(page + 1) }, basePath)} className="btn-secondary !px-3 !py-1.5 text-xs">
          Next
        </Link>
      )}
    </nav>
  );
}

export function EmptyState({ q }: { q?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="font-medium">No tools found</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {q
            ? `Nothing matched “${q}”. Try fewer words, check spelling, or browse categories.`
            : "No tools match the selected filters. Try clearing some filters."}
        </p>
      </div>
      <div className="mt-2 flex gap-2">
        <Link href="/categories" className="btn-secondary">
          Browse categories
        </Link>
        <Link href="/submit" className="btn-primary">
          Submit a tool
        </Link>
      </div>
    </div>
  );
}

export function ResultGrid({ tools }: { tools: ToolWithMeta[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.slug} tool={tool} />
      ))}
    </div>
  );
}
