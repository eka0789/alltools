import type { NextConfig } from "next";

// Every server route that touches the catalog database. Prerendered pages
// are re-rendered by ISR at runtime, so they need the baked db file too.
const DB_ROUTES = [
  "/",
  "/about",
  "/submit",
  "/search",
  "/tools",
  "/tools/[slug]",
  "/categories",
  "/categories/[slug]",
  "/stacks",
  "/stacks/[slug]",
  "/stacks/custom",
  "/ai-chat",
  "/sitemap.xml",
  "/api/search",
  "/api/chat",
  "/admin",
  "/admin/tools",
  "/admin/tools/[id]",
  "/admin/tools/new",
  "/admin/submissions",
];

const dbInclude = Object.fromEntries(DB_ROUTES.map((r) => [r, ["./data/**/*"]]));

const nextConfig: NextConfig = {
  // Vercel/serverless: bake the seeded SQLite database into the traced
  // serverless bundles so the catalog is available at runtime (read-only).
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
    ...dbInclude,
  },
};

export default nextConfig;
