import type { Metadata } from "next";
import Link from "next/link";
import { ToolCardCompact } from "@/components/tool-card";
import { getCatalog } from "@/lib/data";
import { matchStack } from "@/lib/stacks";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const raw = typeof sp.stacks === "string" ? sp.stacks : "";
  const names = raw ? raw.split(",").join(" + ") : "Custom";
  return {
    title: `${names} Stack Toolbox`,
    description: `A personalized developer toolbox for a ${names} stack, matched from the AllTools directory.`,
    robots: { index: false },
  };
}

export default async function CustomStackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = typeof sp.stacks === "string" ? sp.stacks : "";
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);

  const { tools } = getCatalog();
  const pool = tools
    .filter((t) => t.status !== "deprecated")
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      categorySlug: t.categorySlug,
      tags: t.tags,
      languages: t.languages,
      frameworks: t.frameworks,
      featured: t.featured,
    }));
  pool.sort((a, b) => Number(b.featured) - Number(a.featured));
  const sections = matchStack(tokens, pool, 10);
  const labels = tokens.join(" + ") || "Custom stack";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/stacks" className="hover:text-foreground">Stacks</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Custom</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">{labels} Toolbox</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Your personalized toolbox, grouped by workflow stage.
      </p>

      {sections.length === 0 ? (
        <div className="mt-8 card p-6 text-sm text-muted-foreground">
          No tools matched this combination. Try different or broader selections.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">
                {section.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.tools.map((tool) => {
                  const full = getCatalog().bySlug.get(tool.slug);
                  if (!full) return null;
                  return <ToolCardCompact key={tool.slug} tool={full} />;
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
