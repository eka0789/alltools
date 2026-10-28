import Link from "next/link";
import { getCatalog } from "@/lib/data";

export function Footer() {
  const { categories, total } = getCatalog();
  const topCats = categories.slice(0, 8);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-black text-accent-foreground"
                aria-hidden
              >
                AK
              </span>
              <span className="text-sm font-semibold">AktifKoding</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Developer Tools Pro. {total.toLocaleString()} developer tools
              plus premium generators, templates and AI code review — from one
              place.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              The directory is community data. All tools belong to their
              respective owners.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Browse
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {topCats.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Explore
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/best" className="text-muted-foreground hover:text-foreground">Best Tools Guides</Link></li>
              <li><Link href="/templates" className="text-muted-foreground hover:text-foreground">Project Templates</Link></li>
              <li><Link href="/generators/boilerplate" className="text-muted-foreground hover:text-foreground">Boilerplate Generator</Link></li>
              <li><Link href="/generators/api-docs" className="text-muted-foreground hover:text-foreground">API Docs Builder</Link></li>
              <li><Link href="/generators/deployment" className="text-muted-foreground hover:text-foreground">Deployment Config Generator</Link></li>
              <li><Link href="/ai-review" className="text-muted-foreground hover:text-foreground">AI Code Review</Link></li>
              <li><Link href="/ai-chat" className="text-muted-foreground hover:text-foreground">DevDict AI Chat</Link></li>
              <li><Link href="/glossary" className="text-muted-foreground hover:text-foreground">Developer Glossary</Link></li>
              <li><Link href="/whats-new" className="text-muted-foreground hover:text-foreground">What&apos;s New</Link></li>
              <li><Link href="/developers" className="text-muted-foreground hover:text-foreground">Public API & MCP</Link></li>
              <li><Link href="/stacks" className="text-muted-foreground hover:text-foreground">Stack Explorer</Link></li>
              <li><Link href="/collections" className="text-muted-foreground hover:text-foreground">Collections</Link></li>
              <li><Link href="/tags" className="text-muted-foreground hover:text-foreground">Browse by Tag</Link></li>
              <li><Link href="/search" className="text-muted-foreground hover:text-foreground">Search</Link></li>
              <li><Link href="/categories" className="text-muted-foreground hover:text-foreground">All Categories</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contribute
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing &amp; Sponsors</Link></li>
              <li><Link href="/submit" className="text-muted-foreground hover:text-foreground">Submit a Tool</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About &amp; Data Policy</Link></li>
              <li><Link href="/favorites" className="text-muted-foreground hover:text-foreground">Your Shortlist</Link></li>
              <li><Link href="/compare" className="text-muted-foreground hover:text-foreground">Compare Tools</Link></li>
              <li><a href="/feed.xml" className="text-muted-foreground hover:text-foreground">RSS Feed</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} AktifKoding. Not affiliated with any listed tool.</span>
          <span>Find the Right Tool. Build Faster.</span>
        </div>
      </div>
    </footer>
  );
}
