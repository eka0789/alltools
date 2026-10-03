import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCardCompact } from "@/components/tool-card";
import { getCatalog } from "@/lib/data";
import { matchStack, STACKS } from "@/lib/stacks";

export const revalidate = 120;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stack = STACKS.find((s) => s.slug === slug);
  if (!stack) return { title: "Stack not found" };
  return {
    title: `${stack.name} Stack Tools`,
    description: `The essential developer toolbox for a ${stack.name} stack: ${stack.description}`,
    alternates: { canonical: `/stacks/${stack.slug}` },
  };
}

export default async function StackPage({ params }: Props) {
  const { slug } = await params;
  const stack = STACKS.find((s) => s.slug === slug);
  if (!stack) notFound();

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

  const sections = matchStack(stack.tokens, pool, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/stacks" className="hover:text-foreground">Stacks</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{stack.name}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">
        {stack.name} Stack Toolbox
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {stack.description} Tools below are matched from the AllTools directory
        by tags, languages and frameworks.
      </p>

      {sections.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No tools matched this stack yet.
        </p>
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
