import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel/serverless: bake the seeded SQLite database into the traced
  // serverless bundle so the catalog is available at runtime (read-only).
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
