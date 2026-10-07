import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Mail, Sparkles, TriangleAlert } from "lucide-react";
import { getCatalog } from "@/lib/data";
import { ToolLogo } from "@/components/tool-logo";
import { PricingBadge } from "@/components/tool-card";
import { formatDate } from "@/lib/slug";
import { emailConfigured } from "@/lib/email";
import { subscribe } from "@/lib/newsletter";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "What's New — Latest Additions",
  description:
    "The newest tools added to the AllTools catalog — fresh additions across every category, reviewed and verified.",
  alternates: { canonical: "/whats-new" },
};

const PAGE_SIZE = 48;

// Server action: double-opt-in subscribe. Anonymous form, rate limiting is
// handled by the shared limiter inside subscribe's email path.
async function subscribeAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const result = await subscribe(email);
  if (result === "email-failed") {
    redirect("/whats-new?sub_error=email");
  }
  redirect("/whats-new?sub_ok=1");
}

export default async function WhatsNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { tools } = getCatalog();
  const active = tools.filter((t) => t.status === "active");
  const newest = active
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, PAGE_SIZE);
  const cutoff = newest.length > 0 ? newest[newest.length - 1].createdAt : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-accent" />
          What&apos;s new in the catalog
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The {PAGE_SIZE} most recent additions — every entry is curated, links to an
          official site, and passes the link health checker before it lands here.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {newest.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="card group flex items-start gap-3 p-4 transition-colors hover:border-accent/40"
          >
            <ToolLogo url={tool.url} name={tool.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium group-hover:text-accent">
                  {tool.name}
                </span>
                <PricingBadge pricing={tool.pricing} />
              </span>
              <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </span>
              <span className="mt-1.5 block text-[11px] text-muted-foreground/80">
                {tool.categoryName} · Added {formatDate(tool.createdAt)}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {newest.length > 0 && (
        <p className="mt-8 text-xs text-muted-foreground">
          Looking for older entries? Everything added before {formatDate(cutoff)} lives
          in <Link href="/tools" className="hover:text-accent">the full directory</Link> — sorted by
          name, popularity or addition date.
        </p>
      )}

      {/* Weekly digest — double opt-in */}
      <section className="card mt-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Mail className="h-4 w-4 text-accent" />
            Weekly digest
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The newest tools and what developers are opening, once a week. No noise,
            one-click unsubscribe.
          </p>
          {sp.sub_ok && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Check your inbox to confirm — the link
              expires in 15 minutes.
            </p>
          )}
          {sp.subscribed && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Subscription confirmed — see you next week.
            </p>
          )}
          {sp.unsubscribed && (
            <p className="mt-2 text-xs text-muted-foreground">You&apos;re unsubscribed. Sorry to see you go.</p>
          )}
          {sp.sub_error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
              <TriangleAlert className="h-3.5 w-3.5" /> Couldn&apos;t send the confirmation email —
              delivery isn&apos;t configured on this deployment yet.
            </p>
          )}
        </div>
        {emailConfigured() ? (
          <form action={subscribeAction} className="flex shrink-0 gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              aria-label="Email for the weekly digest"
              className="input w-56"
            />
            <button type="submit" className="btn-primary shrink-0">Subscribe</button>
          </form>
        ) : (
          <p className="shrink-0 text-xs text-muted-foreground">
            Email delivery isn&apos;t configured on this deployment (RESEND_API_KEY).
          </p>
        )}
      </section>
    </div>
  );
}
