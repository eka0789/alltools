import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCatalog } from "@/lib/data";
import { ToolLogo } from "@/components/tool-logo";
import { PricingBadge } from "@/components/tool-card";
import { formatDate } from "@/lib/slug";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "What's New — Latest Additions",
  description:
    "The newest tools added to the AllTools catalog — fresh additions across every category, reviewed and verified.",
  alternates: { canonical: "/whats-new" },
};

const PAGE_SIZE = 48;

export default function WhatsNewPage() {
  const { tools } = getCatalog();
  const active = tools.filter((t) => t.status === "active");
  const newest = active
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, PAGE_SIZE);
  const cutoff = newest.length > 0 ? newest[newest.length - 1].createdAt : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-accent" />
          What&apos;s new in the catalog
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The {PAGE_SIZE} most recent additions — every entry is curated, links to an
          official site, and passes the link health checker before it lands here.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {newest.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="card group flex items-start gap-3 p-4 transition-colors hover:border-accent/40"
          >
            <ToolLogo url={tool.url} name={tool.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium group-hover:text-accent">
                  {tool.name}
                </span>
                <PricingBadge pricing={tool.pricing} />
              </span>
              <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </span>
              <span className="mt-1.5 block text-[11px] text-muted-foreground/80">
                {tool.categoryName} · Added {formatDate(tool.createdAt)}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {newest.length > 0 && (
        <p className="mt-8 text-xs text-muted-foreground">
          Looking for older entries? Everything added before {formatDate(cutoff)} lives
          in <Link href="/tools" className="hover:text-accent">the full directory</Link> — sorted by
          name, popularity or addition date.
        </p>
      )}
    </div>
  );
}
