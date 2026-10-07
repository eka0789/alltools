import type { Metadata } from "next";
import Link from "next/link";
import { getSeoLandingPages, SEO_MODIFIERS } from "@/lib/programmatic-seo";

export const metadata: Metadata = {
  title: "Best Developer Tools by Category & Platform",
  description:
    "Curated guides to the best developer tools: free, open source, self-hosted, CLI, desktop, and web-based across every domain.",
  alternates: { canonical: "/best" },
};

export default function BestToolsIndexPage() {
  const pages = getSeoLandingPages();

  // Group pages by category
  const byCategory = new Map<string, typeof pages>();
  for (const page of pages) {
    const list = byCategory.get(page.categoryName) ?? [];
    list.push(page);
    byCategory.set(page.categoryName, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Best Developer Tools</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Best Developer Tools by Category & Platform
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Curated landing pages filtering the catalog by pricing, license, and platform.
          Every list is verified and includes only tools meeting minimum quality and relevance thresholds.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {SEO_MODIFIERS.map((m) => (
          <span
            key={m.slug}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            {m.label} ({pages.filter((p) => p.modifierSlug === m.slug).length})
          </span>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...byCategory.entries()].map(([catName, items]) => (
          <div
            key={catName}
            className="rounded-lg border border-border bg-card p-5"
          >
            <h2 className="text-base font-semibold">{catName}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.modifierSlug}>
                  <Link
                    href={item.url}
                    className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Best {item.modifierLabel}</span>
                    <span className="text-xs font-mono opacity-70">
                      {item.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
