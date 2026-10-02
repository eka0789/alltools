import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Browse All Categories",
  description:
    "Explore the full AllTools taxonomy: programming languages, frontend, backend, API, database, DevOps, cloud, security, AI, design, testing and more.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  const { categories } = getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Browse Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every tool in AllTools belongs to a clear category. Pick one to explore.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="card flex flex-col gap-2 p-5 transition-colors hover:border-accent/40"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <CategoryIcon name={cat.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">
                {cat.toolCount} tools
              </span>
            </div>
            <h2 className="font-semibold">{cat.name}</h2>
            <p className="text-sm text-muted-foreground">{cat.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
