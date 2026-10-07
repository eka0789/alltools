import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/tool-card";
import {
  getSeoLandingPage,
  getSeoLandingPages,
  SEO_MODIFIERS,
} from "@/lib/programmatic-seo";

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string; modifier: string }>;
}

export async function generateStaticParams() {
  const pages = getSeoLandingPages();
  return pages.map((p) => ({
    category: p.categorySlug,
    modifier: p.modifierSlug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, modifier } = await params;
  const page = getSeoLandingPage(category, modifier);
  if (!page) return { title: "Page not found" };

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: page.url },
    openGraph: {
      title: `${page.title} — AllTools`,
      description: page.metaDescription,
      url: page.url,
      type: "website",
    },
  };
}

export default async function SeoLandingPageRoute({ params }: Props) {
  const { category, modifier } = await params;
  const page = getSeoLandingPage(category, modifier);
  if (!page) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Schema: ItemList for rich snippet rankings
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: page.title,
    description: page.metaDescription,
    numberOfItems: page.total,
    itemListElement: page.tools.slice(0, 30).map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      description: tool.description,
      url: `${siteUrl}/tools/${tool.slug}`,
    })),
  };

  // Sibling modifiers for this category (inter-linking)
  const siblingModifiers = SEO_MODIFIERS.filter((m) => m.slug !== modifier).map(
    (m) => ({
      ...m,
      page: getSeoLandingPage(category, m.slug),
    }),
  ).filter((m) => m.page !== null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/best" className="hover:text-foreground">Best Tools</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/categories/${page.categorySlug}`} className="hover:text-foreground">
          {page.categoryName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{page.modifierLabel}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-3">
          <span>{page.categoryName}</span>
          <span>•</span>
          <span className="font-semibold text-foreground">{page.modifierLabel}</span>
          <span>•</span>
          <span>{page.total} tools</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl leading-relaxed">
          {page.metaDescription}
        </p>
      </div>

      {/* Quick Comparison / Decision Aid preview table */}
      <div className="mb-10 rounded-lg border border-border bg-card p-4 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-3">
          Quick Comparison ({page.tools.length} Tools)
        </h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Tool</th>
              <th className="py-2 pr-4 font-medium">Pricing</th>
              <th className="py-2 pr-4 font-medium">Platforms</th>
              <th className="py-2 pr-4 font-medium">Top Strength</th>
              <th className="py-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {page.tools.slice(0, 10).map((tool) => (
              <tr key={tool.slug} className="hover:bg-accent/40 transition-colors">
                <td className="py-2.5 pr-4 font-medium">
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="hover:underline text-foreground"
                  >
                    {tool.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 capitalize">{tool.pricing}</td>
                <td className="py-2.5 pr-4 capitalize">
                  {tool.platforms.slice(0, 2).join(", ") || "Web"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground max-w-xs truncate">
                  {tool.pros?.[0] ?? tool.description}
                </td>
                <td className="py-2.5">
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-primary hover:underline font-mono text-[11px]"
                  >
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {page.tools.length > 10 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing top 10 of {page.tools.length}. Browse the full grid below.
          </p>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {page.tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {/* Related guides (cross-linking for SEO authority) */}
      {siblingModifiers.length > 0 && (
        <div className="mt-14 border-t border-border pt-8">
          <h2 className="text-base font-semibold mb-3">
            More {page.categoryName} Guides
          </h2>
          <div className="flex flex-wrap gap-2">
            {siblingModifiers.map((s) => (
              <Link
                key={s.slug}
                href={`/best/${page.categorySlug}/${s.slug}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Best {s.label} {page.categoryName} ({s.page?.total})
              </Link>
            ))}
            <Link
              href={`/categories/${page.categorySlug}`}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              All {page.categoryName} Tools →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
