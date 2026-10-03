import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel/serverless: bake the seeded SQLite database into every traced
  // serverless bundle so the catalog is available at runtime (read-only).
  // "/**" already covers every route — per-route entries are redundant.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
