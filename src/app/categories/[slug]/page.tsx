import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState, Pagination, ResultGrid } from "@/components/result-grid";
import { searchTools } from "@/lib/search";
import { getCatalog } from "@/lib/data";

export const revalidate = 120;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCatalog().categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Category not found" };
  return {
    title: `${cat.name} — Tools & Resources`,
    description: cat.description,
    alternates: { canonical: `/categories/${cat.slug}` },
    openGraph: { title: `${cat.name} — AllTools`, description: cat.description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const sub = typeof sp.sub === "string" ? sp.sub : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const { categories } = getCatalog();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  // 60 per page with real pagination — the largest category (67 tools) used
  // to silently hide its overflow with no page controls.
  const result = searchTools({
    filters: { category: slug, sub },
    page,
    perPage: 60,
    sort: "name",
  });

  const subs = getCatalog()
    .subcategories.filter((s) => s.categoryId === cat.id)
    .map((s) => ({ slug: s.slug, name: s.name }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/categories" className="hover:text-foreground">Categories</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{cat.name}</span>
      </nav>

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <CategoryIcon name={cat.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cat.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {cat.description}
          </p>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/categories/${cat.slug}`}
            className={`chip ${!sub ? "!border-accent !text-accent" : ""}`}
          >
            All
          </Link>
          {subs.map((s) => (
            <Link
              key={s.slug}
              href={`/categories/${cat.slug}?sub=${s.slug}`}
              className={`chip ${sub === s.slug ? "!border-accent !text-accent" : ""}`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <p className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {result.total.toLocaleString()}
          </span>{" "}
          tools in {cat.name}
        </p>
        {result.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ResultGrid tools={result.items} />
            <Pagination
              params={{ sub, page: String(page) }}
              basePath={`/categories/${cat.slug}`}
              page={result.page}
              totalPages={result.totalPages}
            />
          </>
        )}
      </div>
    </div>
  );
}
