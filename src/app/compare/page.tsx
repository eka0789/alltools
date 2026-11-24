"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Scale, Share2, X } from "lucide-react";
import { setCompare, useCompare } from "@/lib/client-store";
import { useBulkTools, type BulkTool } from "@/lib/use-bulk-tools";
import { ToolLogo } from "@/components/tool-logo";
import { PRICING_LABEL, PLATFORM_LABEL, type Pricing, type Platform } from "@/data/types";

const PRESET_COMPARISONS = [
  { label: "Next.js vs Astro vs Vite", slugs: ["next-js", "astro", "vite"] },
  { label: "Drizzle vs Prisma", slugs: ["drizzle-orm", "prisma"] },
  { label: "PostgreSQL vs SQLite vs Supabase", slugs: ["postgresql", "sqlite", "supabase"] },
  { label: "Docker vs Podman", slugs: ["docker", "podman"] },
];

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {items.map((i) => (
        <span key={i} className="tag-badge">
          {i}
        </span>
      ))}
    </div>
  );
}

function Row({ label }: { label: string }) {
  return (
    <div className="border-t border-border/60 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-border/60 px-3 py-2.5 text-center text-sm">{children}</div>;
}

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localCompare, toggleLocal] = useCompare();
  const [copied, setCopied] = useState(false);

  const urlToolsParam = searchParams.get("tools") ?? "";
  const urlSlugs = urlToolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const usingSharedUrl = urlSlugs.length > 0;
  const activeSlugs = usingSharedUrl ? urlSlugs : localCompare;

  const { tools, loading } = useBulkTools(activeSlugs);
  const ordered = activeSlugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is BulkTool => !!t);

  const cols = `minmax(100px, 0.65fr) repeat(${Math.max(ordered.length, 1)}, minmax(160px, 1fr))`;

  function removeSlug(slug: string) {
    if (usingSharedUrl) {
      const next = urlSlugs.filter((s) => s !== slug);
      router.replace(next.length > 0 ? `/compare?tools=${encodeURIComponent(next.join(","))}` : "/compare");
    } else {
      toggleLocal(slug);
    }
  }

  async function copyShareLink() {
    if (activeSlugs.length === 0) return;
    const shareUrl = `${window.location.origin}/compare?tools=${encodeURIComponent(activeSlugs.join(","))}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Scale className="h-6 w-6 text-accent" />
            Compare tools
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick up to 4 tools with the scale button on any tool card, compare side by side, or share the link with your team.
          </p>
        </div>
        {ordered.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {usingSharedUrl && (
              <button
                type="button"
                onClick={() => {
                  setCompare(activeSlugs);
                  router.replace("/compare");
                }}
                className="btn-secondary !py-1.5 text-xs"
              >
                Save to my compare tray
              </button>
            )}
            <button type="button" onClick={copyShareLink} className="btn-primary !py-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Share link copied!" : "Copy share link"}
            </button>
          </div>
        )}
      </div>

      {activeSlugs.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-4 px-6 py-14 text-center">
          <Scale className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Nothing to compare yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add tools from any card&apos;s scale icon, or try a popular comparison below:
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESET_COMPARISONS.map((p) => (
              <Link
                key={p.label}
                href={`/compare?tools=${encodeURIComponent(p.slugs.join(","))}`}
                className="chip"
              >
                {p.label}
              </Link>
            ))}
          </div>
          <Link href="/tools" className="btn-primary mt-2">
            Browse all tools
          </Link>
        </div>
      ) : loading ? (
        <div className="card mt-8 h-64 animate-pulse bg-muted/40" />
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: cols }}
          >
            {/* header row */}
            <div />
            {ordered.map((t) => (
              <div key={t.slug} className="flex flex-col items-center gap-2 px-3 pb-4 pt-2 text-center">
                <div className="flex w-full items-start justify-end">
                  <button
                    type="button"
                    onClick={() => removeSlug(t.slug)}
                    aria-label={`Remove ${t.name} from comparison`}
                    className="text-muted-foreground transition-colors hover:text-warning"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ToolLogo url={t.url} name={t.name} size="lg" />
                <Link href={`/tools/${t.slug}`} className="font-semibold hover:text-accent">
                  {t.name}
                </Link>
                <span className="text-xs text-muted-foreground">{t.categoryName}</span>
              </div>
            ))}

            <Row label="Pricing" />
            {ordered.map((t) => (
              <Cell key={`p-${t.slug}`}>{PRICING_LABEL[t.pricing as Pricing] ?? t.pricing}</Cell>
            ))}

            <Row label="Open source" />
            {ordered.map((t) => (
              <Cell key={`o-${t.slug}`}>{t.openSource ? "✅ Yes" : "— No"}</Cell>
            ))}

            <Row label="Self-hostable" />
            {ordered.map((t) => (
              <Cell key={`s-${t.slug}`}>{t.selfHosted ? "✅ Yes" : "— No"}</Cell>
            ))}

            <Row label="GitHub stars" />
            {ordered.map((t) => (
              <Cell key={`g-${t.slug}`}>
                {t.githubStars !== null ? `★ ${t.githubStars.toLocaleString()}` : "—"}
              </Cell>
            ))}

            <Row label="Install" />
            {ordered.map((t) => (
              <Cell key={`ic-${t.slug}`}>
                {t.installCommand ? (
                  <code className="inline-block max-w-full overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-[11px]">
                    {t.installCommand}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Cell>
            ))}

            <Row label="Strengths" />
            {ordered.map((t) => (
              <Cell key={`pr-${t.slug}`}>
                {t.pros && t.pros.length > 0 ? (
                  <ul className="space-y-1 text-left text-xs text-muted-foreground">
                    {t.pros.slice(0, 3).map((p) => (
                      <li key={p}>+ {p}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Cell>
            ))}

            <Row label="Trade-offs" />
            {ordered.map((t) => (
              <Cell key={`cn-${t.slug}`}>
                {t.cons && t.cons.length > 0 ? (
                  <ul className="space-y-1 text-left text-xs text-muted-foreground">
                    {t.cons.slice(0, 3).map((c) => (
                      <li key={c}>– {c}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Cell>
            ))}

            <Row label="Platforms" />
            {ordered.map((t) => (
              <Cell key={`pl-${t.slug}`}>
                <List items={t.platforms.map((p) => PLATFORM_LABEL[p as Platform] ?? p)} />
              </Cell>
            ))}

            <Row label="Languages" />
            {ordered.map((t) => (
              <Cell key={`l-${t.slug}`}>
                <List items={t.languages} />
              </Cell>
            ))}

            <Row label="Frameworks" />
            {ordered.map((t) => (
              <Cell key={`f-${t.slug}`}>
                <List items={t.frameworks} />
              </Cell>
            ))}

            <Row label="Links" />
            {ordered.map((t) => (
              <Cell key={`lk-${t.slug}`}>
                <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                    Website
                  </a>
                  {t.githubUrl && (
                    <a href={t.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                      GitHub
                    </a>
                  )}
                  {t.documentationUrl && (
                    <a href={t.documentationUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                      Docs
                    </a>
                  )}
                </div>
              </Cell>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-64 animate-pulse bg-muted/40" /></div>}>
      <CompareInner />
    </Suspense>
  );
}
