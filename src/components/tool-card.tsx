import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import type { ToolWithMeta } from "@/lib/data";
import { ToolLogo } from "./tool-logo";
import { FavoriteButton } from "./favorite-button";
import { CompareButton } from "./compare-button";
import { TrackedOutboundLink } from "./tracked-outbound-link";
import { PRICING_LABEL, type Pricing } from "@/data/types";
import { formatCompact } from "@/lib/slug";

const PRICING_STYLE: Record<Pricing, string> = {
  free: "text-success",
  freemium: "text-warning",
  paid: "text-muted-foreground",
};

// Real GitHub stars (never invented — only rendered when the stats job
// has populated them).
export function StarsBadge({
  stars,
  className = "",
}: {
  stars: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning ${className}`}
      title={`${stars.toLocaleString("en-US")} GitHub stars`}
    >
      <Star className="h-3 w-3 fill-current" />
      {formatCompact(stars)}
    </span>
  );
}

export function PricingBadge({ pricing }: { pricing: string }) {
  // Unknown pricing values fall back to their raw text in a neutral style —
  // silently relabeling them "Free" would be wrong.
  const key = (pricing as Pricing) in PRICING_STYLE ? (pricing as Pricing) : null;
  return (
    <span className={`text-xs font-medium ${key ? PRICING_STYLE[key] : "text-muted-foreground"}`}>
      {key ? PRICING_LABEL[key] : pricing}
    </span>
  );
}

export function ToolCard({ tool }: { tool: ToolWithMeta }) {
  return (
    <article className="card flex h-full flex-col gap-3 p-4 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <ToolLogo url={tool.url} name={tool.name} size="md" />
        <div className="flex items-center gap-1.5">
          {tool.githubStars !== null && <StarsBadge stars={tool.githubStars} />}
          <PricingBadge pricing={tool.pricing} />
          <FavoriteButton slug={tool.slug} name={tool.name} />
          <CompareButton slug={tool.slug} name={tool.name} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold leading-tight">
            <Link href={`/tools/${tool.slug}`} className="hover:text-accent">
              {tool.name}
            </Link>
          </h3>
          {tool.openSource && (
            <span className="tag-badge">Open Source</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tool.subcategoryName ? `${tool.subcategoryName} · ` : ""}
          {tool.categoryName}
        </p>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {tool.description}
      </p>
      {tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag-badge">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <TrackedOutboundLink
          href={tool.url}
          slug={tool.slug}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 !py-1.5 text-xs"
        >
          Open Website
          <ExternalLink className="h-3 w-3" />
        </TrackedOutboundLink>
        <Link href={`/tools/${tool.slug}`} className="btn-primary flex-1 !py-1.5 text-xs">
          Details
        </Link>
      </div>
    </article>
  );
}

export function ToolCardCompact({ tool }: { tool: ToolWithMeta }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="card flex items-center gap-3 p-3 transition-colors hover:border-accent/40"
    >
      <ToolLogo url={tool.url} name={tool.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{tool.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {tool.categoryName}
        </span>
      </span>
      {tool.githubStars !== null && <StarsBadge stars={tool.githubStars} />}
      <PricingBadge pricing={tool.pricing} />
    </Link>
  );
}
