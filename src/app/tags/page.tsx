import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { getCatalog } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Browse by Tag",
  description:
    "Explore the AllTools catalog by tag: trending, AI, open-source, API, testing, design and hundreds more thematic groupings.",
  alternates: { canonical: "/tags" },
};

export default function TagsPage() {
  const { tools } = getCatalog();

  const counts = new Map<string, number>();
  for (const t of tools) {
    if (t.status === "deprecated") continue;
    for (const tag of t.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Tag className="h-6 w-6 text-accent" />
          Browse by tag
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {tags.length.toLocaleString()} thematic tags across the catalog — a different
          lens on the same tools, from <em>trending</em> and <em>ai</em> to niche stacks.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {tags.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/search?tag=${encodeURIComponent(tag)}`}
            className="chip transition-colors hover:!border-accent hover:!text-accent"
          >
            {tag}
            <span className="ml-1.5 text-xs text-muted-foreground/70">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
