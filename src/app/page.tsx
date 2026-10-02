import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { ToolCard, ToolCardCompact } from "@/components/tool-card";
import { CategoryIcon } from "@/components/category-icon";
import { getCatalog } from "@/lib/data";
import { STACKS } from "@/lib/stacks";

export const revalidate = 300;

const POPULAR_SEARCHES = ["JSON", "API", "Regex", "Docker", "Git", "AI", "SQL"];

const UTILITY_LINKS = [
  { label: "JSON", q: "json formatter" },
  { label: "Regex", q: "regex tester" },
  { label: "JWT", q: "jwt decoder" },
  { label: "Base64", q: "base64" },
  { label: "SQL", q: "sql formatter" },
  { label: "Colors", q: "color palette" },
  { label: "CSS", q: "css generator" },
  { label: "Converters", q: "convert" },
];

const AI_LINKS = [
  { label: "AI Coding", href: "/search?category=ai&sub=ai-coding" },
  { label: "AI Models & APIs", href: "/search?category=ai&sub=ai-models" },
  { label: "Agent Frameworks", href: "/search?category=ai&sub=ai-frameworks" },
  { label: "Vector DB", href: "/search?category=ai&sub=vector-db" },
  { label: "MCP", href: "/search?category=ai&sub=mcp" },
];

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel ?? "View all"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { featured, categories, recent, tools, total } = getCatalog();
  const homeCats = categories
    .filter((c) => c.homeOrder !== null)
    .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0));
  const trending = tools
    .filter(
      (t) => t.status === "active" && t.openSource && t.tags.includes("trending"),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              The Developer Dictionary
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything Developers Need,{" "}
              <span className="text-accent">In One Place.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Search thousands of developer tools, resources, services,
              documentation and AI tools.
            </p>
            <div className="mt-7">
              <SearchBox size="lg" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-muted-foreground">Popular searches:</span>
              {POPULAR_SEARCHES.map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip">
                  {s}
                </Link>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              {total.toLocaleString()} curated tools · {categories.length}{" "}
              categories · links verified regularly
            </p>
          </div>
        </div>
      </section>

      {/* Popular Developer Tools */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionHeading title="Popular Developer Tools" href="/tools" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 8).map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* Trending Open Source */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeading
          title="Trending Open Source"
          href="/search?tag=trending&oss=1"
          linkLabel="See all trending"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((tool) => (
            <ToolCardCompact key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* Browse Categories */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SectionHeading title="Browse Categories" href="/categories" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {homeCats.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="card flex flex-col gap-2 p-4 transition-colors hover:border-accent/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <CategoryIcon name={cat.icon} />
                </span>
                <span className="text-sm font-medium leading-tight">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {cat.toolCount} tools
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Utilities */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionHeading title="Developer Utilities" />
        <div className="flex flex-wrap gap-2">
          {UTILITY_LINKS.map((u) => (
            <Link key={u.label} href={`/search?q=${encodeURIComponent(u.q)}`} className="chip">
              {u.label}
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <SectionHeading title="AI Developer Tools" href="/search?category=ai" />
          <div className="flex flex-wrap gap-2">
            {AI_LINKS.map((u) => (
              <Link key={u.label} href={u.href} className="chip">
                {u.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore by Stack */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SectionHeading
            title="Explore by Stack"
            href="/stacks"
            linkLabel="All stacks"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STACKS.slice(0, 10).map((stack) => (
              <Link
                key={stack.slug}
                href={`/stacks/${stack.slug}`}
                className="card p-4 transition-colors hover:border-accent/40"
              >
                <span className="block text-sm font-medium">{stack.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {stack.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Added */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionHeading title="Recently Added" href="/tools?sort=newest" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((tool) => (
            <ToolCardCompact key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
