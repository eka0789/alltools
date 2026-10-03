import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { COLLECTIONS } from "@/data/collections";
import { getCatalog } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Curated Collections",
  description:
    "Starter packs for developers: frontend essentials, backend & API, AI/LLM toolkits, DevOps, data & analytics — curated from the AllTools catalog.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  const catalog = getCatalog();
  const resolve = (slugs: string[]) =>
    slugs.map((s) => catalog.bySlug.get(s)).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LayoutGrid className="h-6 w-6 text-accent" />
          Curated collections
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Starter packs, not rankings — opinionated toolboxes for a job to be done,
          drawn entirely from the catalog.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((c) => {
          const tools = resolve(c.tools);
          return (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="card group flex flex-col gap-3 p-5 transition-colors hover:border-accent/40"
            >
              <span className="text-3xl" aria-hidden>{c.emoji}</span>
              <div>
                <h2 className="font-semibold leading-snug group-hover:text-accent">
                  {c.title}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
              <div className="mt-auto flex flex-wrap gap-1">
                {tools.slice(0, 5).map((t) => (
                  <span key={t.slug} className="tag-badge">{t.name}</span>
                ))}
                {tools.length > 5 && (
                  <span className="tag-badge">+{tools.length - 5} more</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
