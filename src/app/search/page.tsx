import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/search-box";
import {
  Filters,
  activeFilterChips,
  buildHref,
  type BrowserSearchParams,
} from "@/components/filters";
import { EmptyState, Pagination, ResultGrid } from "@/components/result-grid";
import { parseFilters, searchTools } from "@/lib/search";
import { getCatalog } from "@/lib/data";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `Search: ${q}` : "Search developer tools",
    description: q
      ? `Developer tools matching “${q}” — API tools, formatters, testing, AI and more.`
      : "Search thousands of developer tools, resources and AI services with fuzzy matching, synonyms and task-based search.",
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params: BrowserSearchParams = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) params[k as keyof BrowserSearchParams] = s as never;
  }
  const q = params.q ?? "";
  const filters = parseFilters(raw);
  const page = Number(params.page ?? "1") || 1;
  const result = searchTools({ q, filters, page, perPage: 24 });
  const { categories } = getCatalog();

  const chips = activeFilterChips(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <SearchBox size="lg" initialQuery={q} autoFocus />
      </div>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <Filters
          params={params}
          basePath="/search"
          facets={result.facets}
          categories={categories}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {result.total.toLocaleString()}
              </span>{" "}
              tool{result.total === 1 ? "" : "s"}
              {q ? (
                <>
                  {" "}
                  for <span className="font-medium text-foreground">“{q}”</span>
                </>
              ) : null}
            </p>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip, i) => (
                  <Link
                    key={i}
                    href={(() => {
                      const patch: Record<string, string> = {};
                      for (const [k, v] of Object.entries(chip.patch)) {
                        if (v) patch[k] = v;
                      }
                      return buildHref(params, patch, "/search");
                    })()}
                    className="chip !bg-accent-soft !text-accent"
                  >
                    {chip.label} ✕
                  </Link>
                ))}
              </div>
            )}
          </div>

          {result.items.length === 0 ? (
            <EmptyState q={q} />
          ) : (
            <>
              <ResultGrid tools={result.items} />
              <Pagination
                params={params}
                basePath="/search"
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
