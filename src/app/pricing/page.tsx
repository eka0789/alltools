import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCatalog } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Pricing — Pro & Sponsored Listings",
  description:
    "AllTools is free for developers, forever. Upgrade to Pro for team workflows and API limits, or promote your tool with clearly labeled sponsored listings.",
  alternates: { canonical: "/pricing" },
};

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

export default function PricingPage() {
  const { total, categories } = getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" />
          Prototype — founding sponsors get 50% off for 3 months
        </p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          Free for developers. <span className="text-accent">Fair for vendors.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Searching {total.toLocaleString()} tools across {categories.length}{" "}
          categories stays free forever. Pro pays for power workflows, and
          vendors pay for visibility — always labeled, never mixed into
          editorial judgment.
        </p>
      </header>

      {/* For developers */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">For developers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The directory never goes behind a paywall. Pro is for people who live
          in it every day.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="card flex flex-col p-6">
            <p className="text-sm font-semibold">Community</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-xs text-muted-foreground">forever</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything the directory does today.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Full search, categories, collections &amp; glossary</Feature>
              <Feature>Compare tools, shortlist &amp; stack explorer</Feature>
              <Feature>Public API &amp; MCP fair use (60 req/min)</Feature>
              <Feature>Weekly digest &amp; RSS feed</Feature>
            </ul>
            <div className="mt-6 flex gap-2">
              <Link href="/search" className="btn-secondary flex-1">
                Start searching
              </Link>
            </div>
          </div>

          <div className="card relative flex flex-col border-accent/50 p-6">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
              Planned — join the waitlist
            </span>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Rocket className="h-4 w-4 text-accent" />
              Pro
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$6</span>
              <span className="text-xs text-muted-foreground">/month, or $48/year</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              For teams and heavy users who want the catalog as a workflow.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Everything in Community</Feature>
              <Feature>Cross-device sync of shortlists &amp; compare boards</Feature>
              <Feature>Private team collections with shareable links</Feature>
              <Feature>New-tool alerts for your stacks &amp; tags</Feature>
              <Feature>Stack export to Markdown &amp; package.json</Feature>
              <Feature>Higher API limits + API key for scripts &amp; CI</Feature>
            </ul>
            <div className="mt-6 flex gap-2">
              <Link href="/login" className="btn-primary flex-1">
                Get notified at launch
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* For vendors */}
      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Megaphone className="h-5 w-5 text-accent" />
          For tool vendors — sponsored listings
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Reach developers at the exact moment they compare tools. Every paid
          placement carries a visible <strong>Sponsored</strong> label and never
          changes our pros/cons or maintenance badges.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck className="h-4 w-4 text-accent" />
              Verified Listing
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$29</span>
              <span className="text-xs text-muted-foreground">one-time</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Get reviewed fast and look official. No ranking boost.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Editorial review within 3 business days</Feature>
              <Feature>Verified badge + enriched profile page</Feature>
              <Feature>Logo, screenshots &amp; install command</Feature>
              <Feature>Fast-lane corrections when you ship updates</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-secondary w-full">
                Submit your tool
              </Link>
            </div>
          </div>

          <div className="card relative flex flex-col border-accent/50 p-6">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
              Most popular
            </span>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              Featured Placement
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$79</span>
              <span className="text-xs text-muted-foreground">/tool /month</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A labeled top slot on your category + search pages.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Pinned Sponsored slot (max 2 per category)</Feature>
              <Feature>Shows on category, search &amp; alternatives panels</Feature>
              <Feature>Monthly report: impressions, clicks, CTR</Feature>
              <Feature>Pause or cancel anytime, pro-rated refund</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-primary w-full">
                Claim a featured slot
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-accent" />
              Category Sponsorship
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$249</span>
              <span className="text-xs text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Own the category where your buyers already compare.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Exclusive header sponsor on one category</Feature>
              <Feature>Logo + line in the weekly digest (4 issues)</Feature>
              <Feature>Mention on What&apos;s New when you launch</Feature>
              <Feature>Only 1 sponsor per category — first come, first served</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-secondary w-full">
                Sponsor a category
              </Link>
            </div>
          </div>
        </div>

        <div className="card mt-4 flex flex-col gap-2 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Add-on:</strong> Newsletter
            Spotlight — your launch in front of every subscriber for{" "}
            <strong className="text-foreground">$49/issue</strong>.
          </p>
          <Link
            href="/whats-new"
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            See the digest vendors sponsor
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Trust */}
      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-accent" />
          Sponsored, but never sold out
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm font-semibold">Always labeled</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Paid slots say Sponsored wherever they appear — category tops,
              search results and newsletters.
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold">Rankings stay editorial</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Money buys visibility, not verdicts. Pros/cons, maintenance
              badges and alternatives are written by editors.
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold">Measured honestly</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sponsors get real numbers from our click tracking — impressions,
              outbound clicks and CTR. No invented stats.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              q: "Will the directory stay free?",
              a: "Yes. Search, categories, tool pages, the public API fair-use tier and RSS stay free forever — that traffic is exactly what makes sponsorships valuable.",
            },
            {
              q: "Do sponsors rank higher organically?",
              a: "No. Sponsored slots are separate pinned placements with a label. Organic order keeps using editorial signals: relevance, maintenance freshness and real click data.",
            },
            {
              q: "How do we start as a founding sponsor?",
              a: "Submit your tool, then reply to the review email mentioning the slot you want. The first sponsors in each category get 50% off for 3 months while we calibrate pricing to real traffic.",
            },
            {
              q: "How will we pay?",
              a: "Manual invoicing for founding sponsors (bank transfer / QRIS for Indonesia, Paddle for international cards). Automated checkout with Midtrans/Xendit + Paddle comes with the Pro launch.",
            },
            {
              q: "Can we cancel?",
              a: "Monthly slots cancel anytime and unused full weeks are refunded. The $29 Verified review is a one-time editorial service.",
            },
          ].map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="cursor-pointer text-sm font-semibold marker:text-accent">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card mt-14 p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Sell where developers decide.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          If your tool is already listed, you are one email away from a
          sponsored slot. If it is not, submit it — Verified review covers both
          in one pass.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/submit" className="btn-primary">
            Submit / claim your tool
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/about" className="btn-secondary">
            Read our data policy
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Prototype pricing — final rates lock at Pro launch. Read{" "}
          <Link href="/about" className="text-accent hover:underline">
            how we keep data honest
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
