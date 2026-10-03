import Link from "next/link";
import { getCatalog } from "@/lib/data";
import { parseFilters, type SearchFilters } from "@/lib/search";

export interface BrowserSearchParams {
  q?: string;
  category?: string;
  sub?: string;
  pricing?: string;
  platform?: string;
  tag?: string;
  lang?: string;
  framework?: string;
  oss?: string;
  selfhosted?: string;
  docs?: string;
  github?: string;
  free?: string;
  page?: string;
  sort?: string;
}

export function buildHref(
  current: BrowserSearchParams,
  patch: Partial<BrowserSearchParams>,
  basePath: string,
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) {
    if (v !== undefined && v !== "") merged[k] = Array.isArray(v) ? v[0] : v;
  }
  // Changing any filter must reset to page 1 — keeping the old page number
  // lands users on an empty page of the narrowed result set. Pagination
  // links pass `page` explicitly in the patch, so they are unaffected.
  if (patch.page === undefined) delete merged.page;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") delete merged[k];
    else merged[k] = v;
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const PLATFORMS = [
  { key: "web", label: "Web" },
  { key: "desktop", label: "Desktop" },
  { key: "cli", label: "CLI" },
  { key: "mobile", label: "Mobile" },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col items-start gap-1.5">{children}</div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        active ? "font-medium text-accent" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className="ml-1.5 text-xs text-muted-foreground/70">{count}</span>
      )}
    </Link>
  );
}

export function Filters({
  params,
  basePath,
  facets,
  categories,
}: {
  params: BrowserSearchParams;
  basePath: string;
  facets: { categories: { slug: string; name: string; count: number }[]; pricing: { key: string; count: number }[] };
  categories: { slug: string; name: string; toolCount: number }[];
}) {
  const filters = parseFilters(params as Record<string, string>);
  const cat = categories.find((c) => c.slug === filters.category);
  const hasActive = Object.values(filters).some((v) => v !== undefined);

  return (
    <aside className="w-full lg:w-56 lg:shrink-0">
      <div className="lg:sticky lg:top-20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          {hasActive && (
            <Link href={basePath} className="text-xs text-accent hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <FilterGroup title="Category">
          <FilterLink
            href={buildHref(params, { category: undefined, sub: undefined }, basePath)}
            active={!filters.category}
          >
            All categories
          </FilterLink>
          {(facets.categories.length > 0
            ? facets.categories.map((f) => ({ slug: f.slug, name: f.name, count: f.count }))
            : categories.map((c) => ({ slug: c.slug, name: c.name, count: c.toolCount }))
          ).map((c) => (
              <FilterLink
                key={c.slug}
                href={buildHref(params, { category: c.slug, sub: undefined }, basePath)}
                active={filters.category === c.slug}
                count={c.count}
              >
                {c.name}
              </FilterLink>
            ))}
        </FilterGroup>
        {cat && (
          <FilterGroup title={`In ${cat.name}`}>
            <FilterLink href={buildHref(params, { sub: undefined }, basePath)} active={!filters.sub}>
              All subcategories
            </FilterLink>
            <SubLinks params={params} basePath={basePath} categorySlug={cat.slug} current={filters.sub} />
          </FilterGroup>
        )}
        <FilterGroup title="Pricing">
          <FilterLink href={buildHref(params, { pricing: undefined }, basePath)} active={!filters.pricing}>
            Any
          </FilterLink>
          {facets.pricing.map((p) => (
            <FilterLink
              key={p.key}
              href={buildHref(params, { pricing: p.key }, basePath)}
              active={filters.pricing === p.key}
              count={p.count}
            >
              {p.key === "free" ? "Free" : p.key === "freemium" ? "Freemium" : "Paid"}
            </FilterLink>
          ))}
          <FilterLink href={buildHref(params, { free: filters.free ? undefined : "1" }, basePath)} active={!!filters.free}>
            Free / Open Source
          </FilterLink>
        </FilterGroup>
        <FilterGroup title="Platform">
          <FilterLink href={buildHref(params, { platform: undefined }, basePath)} active={!filters.platform}>
            Any
          </FilterLink>
          {PLATFORMS.map((p) => (
            <FilterLink
              key={p.key}
              href={buildHref(params, { platform: p.key }, basePath)}
              active={filters.platform === p.key}
            >
              {p.label}
            </FilterLink>
          ))}
        </FilterGroup>
        <FilterGroup title="Attributes">
          <FilterLink href={buildHref(params, { oss: filters.oss ? undefined : "1" }, basePath)} active={!!filters.oss}>
            Open Source
          </FilterLink>
          <FilterLink href={buildHref(params, { selfhosted: filters.selfhosted ? undefined : "1" }, basePath)} active={!!filters.selfhosted}>
            Self-hostable
          </FilterLink>
          <FilterLink href={buildHref(params, { github: filters.github ? undefined : "1" }, basePath)} active={!!filters.github}>
            GitHub available
          </FilterLink>
          <FilterLink href={buildHref(params, { docs: filters.docs ? undefined : "1" }, basePath)} active={!!filters.docs}>
            Documentation available
          </FilterLink>
        </FilterGroup>
      </div>
    </aside>
  );
}

function SubLinks({
  params,
  basePath,
  categorySlug,
  current,
}: {
  params: BrowserSearchParams;
  basePath: string;
  categorySlug: string;
  current?: string;
}) {
  const { categories, subcategories } = getCatalog();
  const cat = categories.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const subs = subcategories
    .filter((s) => s.categoryId === cat.id)
    .map((s) => ({ slug: s.slug, name: s.name }));
  return (
    <>
      {subs.map((s) => (
        <FilterLink
          key={s.slug}
          href={buildHref(params, { sub: s.slug }, basePath)}
          active={current === s.slug}
        >
          {s.name}
        </FilterLink>
      ))}
    </>
  );
}

export function activeFilterChips(
  filters: SearchFilters,
): { label: string; patch: Partial<BrowserSearchParams> }[] {
  const chips: { label: string; patch: Partial<BrowserSearchParams> }[] = [];
  if (filters.category) chips.push({ label: `Category: ${filters.category}`, patch: { category: undefined, sub: undefined } });
  if (filters.sub) chips.push({ label: `Sub: ${filters.sub}`, patch: { sub: undefined } });
  if (filters.pricing) chips.push({ label: `Pricing: ${filters.pricing}`, patch: { pricing: undefined } });
  if (filters.platform) chips.push({ label: `Platform: ${filters.platform}`, patch: { platform: undefined } });
  if (filters.tag) chips.push({ label: `Tag: ${filters.tag}`, patch: { tag: undefined } });
  // lang/framework arrive from tool-detail deep links; without chips users
  // could not see (or remove) the filter that silently narrowed the results.
  if (filters.lang) chips.push({ label: `Language: ${filters.lang}`, patch: { lang: undefined } });
  if (filters.framework) chips.push({ label: `Framework: ${filters.framework}`, patch: { framework: undefined } });
  if (filters.oss) chips.push({ label: "Open Source", patch: { oss: undefined } });
  if (filters.selfhosted) chips.push({ label: "Self-hostable", patch: { selfhosted: undefined } });
  if (filters.docs) chips.push({ label: "Has docs", patch: { docs: undefined } });
  if (filters.github) chips.push({ label: "Has GitHub", patch: { github: undefined } });
  if (filters.free) chips.push({ label: "Free", patch: { free: undefined } });
  return chips;
}

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "name", label: "Name A–Z" },
  { key: "newest", label: "Newest" },
] as const;

// Sort control — the sort param was honored in the URL but had no UI, so
// users could enter "newest" via homepage links and never leave it.
export function SortLinks({
  params,
  basePath,
  active,
}: {
  params: BrowserSearchParams;
  basePath: string;
  active: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Sort results">
      <span className="mr-1 text-xs text-muted-foreground">Sort:</span>
      {SORTS.map((s) => (
        <Link
          key={s.key}
          href={buildHref(params, { sort: s.key }, basePath)}
          aria-current={active === s.key ? "true" : undefined}
          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
            active === s.key
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
