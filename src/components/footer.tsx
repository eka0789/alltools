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
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent font-mono text-[11px] font-bold text-accent-foreground">
                A
              </span>
              <span className="text-sm font-semibold">AllTools</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              The Developer Dictionary. {total.toLocaleString()} developer tools,
              resources and AI services — searchable from one place.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              AllTools is a directory. All tools belong to their respective
              owners.
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
              <li><Link href="/ai-chat" className="text-muted-foreground hover:text-foreground">DevDict AI Chat</Link></li>
              <li><Link href="/glossary" className="text-muted-foreground hover:text-foreground">Developer Glossary</Link></li>
              <li><Link href="/whats-new" className="text-muted-foreground hover:text-foreground">What&apos;s New</Link></li>
              <li><Link href="/developers" className="text-muted-foreground hover:text-foreground">Public API &amp; MCP</Link></li>
              <li><Link href="/stacks" className="text-muted-foreground hover:text-foreground">Stack Explorer</Link></li>
              <li><Link href="/collections" className="text-muted-foreground hover:text-foreground">Collections</Link></li>
              <li><Link href="/tags" className="text-muted-foreground hover:text-foreground">Browse by Tag</Link></li>
              <li><Link href="/tools" className="text-muted-foreground hover:text-foreground">All Tools</Link></li>
              <li><Link href="/search" className="text-muted-foreground hover:text-foreground">Search</Link></li>
              <li><Link href="/categories" className="text-muted-foreground hover:text-foreground">All Categories</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contribute
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/submit" className="text-muted-foreground hover:text-foreground">Submit a Tool</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About &amp; Data Policy</Link></li>
              <li><Link href="/favorites" className="text-muted-foreground hover:text-foreground">Your Shortlist</Link></li>
              <li><Link href="/compare" className="text-muted-foreground hover:text-foreground">Compare Tools</Link></li>
              <li><a href="/feed.xml" className="text-muted-foreground hover:text-foreground">RSS Feed</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} AllTools. Not affiliated with any listed tool.</span>
          <span>Find the Right Tool. Build Faster.</span>
        </div>
      </div>
    </footer>
  );
}
