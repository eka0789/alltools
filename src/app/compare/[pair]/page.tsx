import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, ExternalLink, Scale, Star, X } from "lucide-react";
import { getTopComparePairs, parseComparePair } from "@/lib/compare-seo";
import { ToolLogo } from "@/components/tool-logo";
import { PLATFORM_LABEL, PRICING_LABEL, type Platform, type Pricing } from "@/data/types";

export const revalidate = 3600;

export function generateStaticParams() {
  return getTopComparePairs(60).map((p) => ({ pair: p.pair }));
}

interface Props {
  params: Promise<{ pair: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parseComparePair(pair);
  if (!parsed) return { title: "Comparison not found" };
  const { toolA, toolB, pair: canonical } = parsed;
  const title = `${toolA.name} vs ${toolB.name} — Comparison, Pricing & Features`;
  const description = `Compare ${toolA.name} and ${toolB.name} side by side: pricing, open-source license, GitHub stars, platforms, strengths, and trade-offs for developers.`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${canonical}` },
    openGraph: { title, description, type: "website" },
  };
}

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <Check className="h-3.5 w-3.5" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <X className="h-3.5 w-3.5" /> No
    </span>
  );
}

export default async function ComparePairPage({ params }: Props) {
  const { pair } = await params;
  const parsed = parseComparePair(pair);
  if (!parsed) notFound();
  if (!parsed.isCanonical) {
    redirect(`/compare/${parsed.pair}`);
  }

  const { toolA, toolB } = parsed;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const relatedPairs = getTopComparePairs(40)
    .filter(
      (p) =>
        p.pair !== parsed.pair &&
        (p.toolA.slug === toolA.slug ||
          p.toolB.slug === toolA.slug ||
          p.toolA.slug === toolB.slug ||
          p.toolB.slug === toolB.slug),
    )
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${siteUrl}/compare` },
      {
        "@type": "ListItem",
        position: 3,
        name: `${toolA.name} vs ${toolB.name}`,
        item: `${siteUrl}/compare/${parsed.pair}`,
      },
    ],
  };

  const rows: { label: string; a: React.ReactNode; b: React.ReactNode }[] = [
    {
      label: "Category",
      a: (
        <Link href={`/categories/${toolA.categorySlug}`} className="text-accent hover:underline">
          {toolA.categoryName}
        </Link>
      ),
      b: (
        <Link href={`/categories/${toolB.categorySlug}`} className="text-accent hover:underline">
          {toolB.categoryName}
        </Link>
      ),
    },
    {
      label: "Pricing",
      a: PRICING_LABEL[toolA.pricing as Pricing] ?? toolA.pricing,
      b: PRICING_LABEL[toolB.pricing as Pricing] ?? toolB.pricing,
    },
    {
      label: "Open Source",
      a: <BoolBadge value={toolA.openSource} />,
      b: <BoolBadge value={toolB.openSource} />,
    },
    {
      label: "Self-Hosted",
      a: <BoolBadge value={toolA.selfHosted} />,
      b: <BoolBadge value={toolB.selfHosted} />,
    },
    {
      label: "GitHub Stars",
      a: toolA.githubStars ? (
        <span className="inline-flex items-center gap-1 font-mono text-xs">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {toolA.githubStars.toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      b: toolB.githubStars ? (
        <span className="inline-flex items-center gap-1 font-mono text-xs">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {toolB.githubStars.toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "License",
      a: toolA.githubLicense ?? <span className="text-muted-foreground">—</span>,
      b: toolB.githubLicense ?? <span className="text-muted-foreground">—</span>,
    },
    {
      label: "Platforms",
      a:
        toolA.platforms.length > 0
          ? toolA.platforms.map((p) => PLATFORM_LABEL[p as Platform] ?? p).join(", ")
          : "—",
      b:
        toolB.platforms.length > 0
          ? toolB.platforms.map((p) => PLATFORM_LABEL[p as Platform] ?? p).join(", ")
          : "—",
    },
    {
      label: "Languages",
      a: toolA.languages.length > 0 ? toolA.languages.join(", ") : "—",
      b: toolB.languages.length > 0 ? toolB.languages.join(", ") : "—",
    },
    {
      label: "Install Command",
      a: toolA.installCommand ? (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {toolA.installCommand}
        </code>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      b: toolB.installCommand ? (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {toolB.installCommand}
        </code>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/compare" className="hover:text-foreground">Compare</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">
          {toolA.name} vs {toolB.name}
        </span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Scale className="h-6 w-6 text-accent" />
            {toolA.name} vs {toolB.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Side-by-side developer comparison of {toolA.name} and {toolB.name}: pricing, open-source
            signals, platforms, and trade-offs.
          </p>
        </div>
        <Link
          href={`/compare?tools=${encodeURIComponent(`${toolA.slug},${toolB.slug}`)}`}
          className="btn-secondary !py-1.5 text-xs"
        >
          Add more tools to compare
        </Link>
      </header>

      {/* Tool summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[toolA, toolB].map((t) => (
          <div key={t.slug} className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <ToolLogo url={t.url} name={t.name} size="md" />
              <div className="min-w-0">
                <Link href={`/tools/${t.slug}`} className="font-semibold hover:text-accent">
                  {t.name}
                </Link>
                <p className="text-xs text-muted-foreground">{t.categoryName}</p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              {t.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/tools/${t.slug}`} className="btn-secondary !py-1 text-xs">
                Full details
              </Link>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !py-1 text-xs"
              >
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 w-1/4">Attribute</th>
              <th className="px-4 py-3 w-[37.5%]">{toolA.name}</th>
              <th className="px-4 py-3 w-[37.5%]">{toolB.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {r.label}
                </td>
                <td className="px-4 py-3 text-sm">{r.a}</td>
                <td className="px-4 py-3 text-sm">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strengths & Trade-offs */}
      {(toolA.pros.length > 0 || toolB.pros.length > 0 || toolA.cons.length > 0 || toolB.cons.length > 0) && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {[toolA, toolB].map((t) => (
            <div key={t.slug} className="card p-5">
              <h2 className="text-sm font-semibold">{t.name} — Strengths &amp; Trade-offs</h2>
              {t.pros.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs">
                  {t.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
              {t.cons.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {t.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Related comparisons */}
      {relatedPairs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Related comparisons</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedPairs.map((rp) => (
              <Link key={rp.pair} href={`/compare/${rp.pair}`} className="chip">
                {rp.toolA.name} vs {rp.toolB.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
