import type { Metadata } from "next";
import { Filters, SortLinks, type BrowserSearchParams } from "@/components/filters";
import { EmptyState, Pagination, ResultGrid } from "@/components/result-grid";
import { parseFilters, searchTools } from "@/lib/search";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "All Developer Tools",
  description:
    "Browse the full AllTools directory: API tools, formatters, databases, DevOps, AI coding tools, design utilities and more.",
  alternates: { canonical: "/tools" },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ToolsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params: BrowserSearchParams = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) params[k as keyof BrowserSearchParams] = s as never;
  }
  const filters = parseFilters(raw);
  const page = Number(params.page ?? "1") || 1;
  const sort = params.sort === "newest" ? "newest" : "name";
  const result = searchTools({ filters, page, perPage: 24, sort });
  const { categories } = getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">All Developer Tools</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse the complete directory — use filters to narrow down.
      </p>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <Filters
          params={params}
          basePath="/tools"
          facets={result.facets}
          categories={categories}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {result.total.toLocaleString()}
              </span>{" "}
              tools
            </p>
            <SortLinks params={params} basePath="/tools" active={sort} />
          </div>
          {result.items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ResultGrid tools={result.items} />
              <Pagination
                params={params}
                basePath="/tools"
                page={result.page}
                totalPages={result.totalPages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
