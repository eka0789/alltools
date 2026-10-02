import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Link2,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.11-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
import { ToolLogo } from "@/components/tool-logo";
import { PricingBadge } from "@/components/tool-card";
import { getToolBySlug, getCatalog } from "@/lib/data";
import { PLATFORM_LABEL, type Platform } from "@/data/types";
import { formatDate } from "@/lib/slug";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Tool not found" };
  return {
    title: `${tool.name} — ${tool.categoryName}`,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: {
      title: `${tool.name} — AllTools`,
      description: tool.description,
      type: "website",
      url: `/tools/${tool.slug}`,
    },
  };
}

function LinkButton({
  href,
  icon,
  children,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="btn-secondary"
    >
      {icon}
      {children}
    </a>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || tool.status === "deprecated") notFound();

  const catalog = getCatalog();
  const resolve = (slugs: string[]) =>
    slugs.map((s) => catalog.bySlug.get(s)).filter((t): t is NonNullable<typeof t> => !!t);
  const alternatives = resolve(tool.alternatives);
  const related = resolve(tool.relatedTools);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: tool.url,
    applicationCategory: tool.categoryName,
    ...(tool.openSource ? { license: "https://opensource.org/licenses" } : {}),
    offers: {
      "@type": "Offer",
      price:
        tool.pricing === "free" ? "0" : tool.pricing === "paid" ? undefined : "0",
      priceCurrency: "USD",
      description: tool.pricing,
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Categories", item: "/categories" },
      {
        "@type": "ListItem",
        position: 3,
        name: tool.categoryName,
        item: `/categories/${tool.categorySlug}`,
      },
      { "@type": "ListItem", position: 4, name: tool.name, item: `/tools/${tool.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/categories" className="hover:text-foreground">Categories</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/categories/${tool.categorySlug}`} className="hover:text-foreground">
          {tool.categoryName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{tool.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ToolLogo url={tool.url} name={tool.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {tool.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/categories/${tool.categorySlug}`}
                className="tag-badge hover:text-accent"
              >
                {tool.categoryName}
              </Link>
              {tool.subcategoryName && <span className="tag-badge">{tool.subcategoryName}</span>}
              {tool.openSource && <span className="tag-badge">Open Source</span>}
              {tool.selfHosted && <span className="tag-badge">Self-hostable</span>}
              <PricingBadge pricing={tool.pricing} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open Website
            <ArrowUpRight className="h-4 w-4" />
          </a>
          {tool.githubUrl && (
            <LinkButton href={tool.githubUrl} icon={<GithubIcon className="h-4 w-4" />} external>
              GitHub
            </LinkButton>
          )}
          {tool.documentationUrl && (
            <LinkButton href={tool.documentationUrl} icon={<BookOpen className="h-4 w-4" />} external>
              Docs
            </LinkButton>
          )}
        </div>
      </div>

      {/* Directory notice */}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link2 className="h-3 w-3" />
        AllTools is a directory — this link opens the official {tool.name} website.
        {tool.verified ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" />
            Link verified {tool.lastVerifiedAt ? formatDate(tool.lastVerifiedAt) : ""}
          </span>
        ) : (
          <span>Link pending verification</span>
        )}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Useful for */}
          {tool.useCases.length > 0 && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Useful for
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {tool.useCases.map((u) => (
                  <li key={u} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {u}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">
                Alternatives to {tool.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {alternatives.map((alt) => (
                  <Link
                    key={alt.slug}
                    href={`/tools/${alt.slug}`}
                    className="card flex items-center gap-3 p-3.5 transition-colors hover:border-accent/40"
                  >
                    <ToolLogo url={alt.url} name={alt.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{alt.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {alt.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related */}
          {related.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Related Tools</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/tools/${rel.slug}`}
                    className="card flex items-center gap-3 p-3.5 transition-colors hover:border-accent/40"
                  >
                    <ToolLogo url={rel.url} name={rel.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{rel.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {rel.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Meta sidebar */}
        <aside>
          <div className="card p-5 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h2>
            <dl className="mt-2">
              <MetaRow label="Category">
                <Link href={`/categories/${tool.categorySlug}`} className="hover:text-accent">
                  {tool.categoryName}
                </Link>
              </MetaRow>
              {tool.subcategoryName && (
                <MetaRow label="Subcategory">{tool.subcategoryName}</MetaRow>
              )}
              <MetaRow label="Pricing">
                <PricingBadge pricing={tool.pricing} />
              </MetaRow>
              <MetaRow label="Open Source">
                {tool.openSource ? "Yes" : "No"}
              </MetaRow>
              <MetaRow label="Self-hostable">
                {tool.selfHosted ? "Yes" : "No"}
              </MetaRow>
              {tool.platforms.length > 0 && (
                <MetaRow label="Platforms">
                  {tool.platforms
                    .map((p) => PLATFORM_LABEL[p as Platform] ?? p)
                    .join(" · ")}
                </MetaRow>
              )}
              {tool.languages.length > 0 && (
                <MetaRow label="Languages">
                  <span className="flex flex-wrap justify-end gap-1">
                    {tool.languages.map((l) => (
                      <Link key={l} href={`/search?lang=${encodeURIComponent(l)}`} className="tag-badge hover:text-accent">
                        {l}
                      </Link>
                    ))}
                  </span>
                </MetaRow>
              )}
              {tool.frameworks.length > 0 && (
                <MetaRow label="Frameworks">
                  <span className="flex flex-wrap justify-end gap-1">
                    {tool.frameworks.map((f) => (
                      <Link key={f} href={`/search?framework=${encodeURIComponent(f)}`} className="tag-badge hover:text-accent">
                        {f}
                      </Link>
                    ))}
                  </span>
                </MetaRow>
              )}
            </dl>
            {tool.tags.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tool.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?tag=${encodeURIComponent(tag)}`}
                      className="tag-badge hover:text-accent"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </>
            )}
            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              Metadata is editorially curated and periodically re-verified.
              Always confirm pricing on the official website.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
