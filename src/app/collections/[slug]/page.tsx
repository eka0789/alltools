import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COLLECTIONS } from "@/data/collections";
import { getCatalog } from "@/lib/data";
import { ResultGrid } from "@/components/result-grid";

export const revalidate = 120;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { title: "Collection not found" };
  return {
    title: `${collection.title} — Curated Collection`,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: `${collection.emoji} ${collection.title} — AllTools`,
      description: collection.tagline,
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) notFound();

  const catalog = getCatalog();
  const tools = collection.tools
    .map((s) => catalog.bySlug.get(s))
    .filter((t): t is NonNullable<typeof t> => !!t && t.status !== "deprecated");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/collections" className="hover:text-foreground">Collections</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{collection.title}</span>
      </nav>

      <header className="max-w-2xl">
        <span className="text-4xl" aria-hidden>{collection.emoji}</span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{collection.title}</h1>
        <p className="mt-1 text-sm font-medium text-accent">{collection.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {collection.description}
        </p>
      </header>

      <div className="mt-8">
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tools.length}</span> tools in
          this collection
        </p>
        <ResultGrid tools={tools} />
      </div>

      <aside className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Tip: press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl/⌘ K
          </kbd>{" "}
          anywhere to search the whole catalog, or tap the heart on a tool to save it.
        </span>
      </aside>
    </div>
  );
}
