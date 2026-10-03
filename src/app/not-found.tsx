import Link from "next/link";
import { SearchX } from "lucide-react";

// Root 404 — previously invalid tool slugs hit the unstyled default.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground/50" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The page or tool you&apos;re looking for doesn&apos;t exist, was renamed, or was
        removed from the directory.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back home
        </Link>
        <Link href="/tools" className="btn-secondary">
          Browse all tools
        </Link>
        <Link href="/categories" className="btn-secondary">
          Browse categories
        </Link>
      </div>
    </div>
  );
}
