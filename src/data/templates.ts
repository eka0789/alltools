// AktifKoding Pro — template proyek katalog. Hanya data & metadata; isi file
// template dihasilkan oleh src/lib/generators/boilerplate.ts (preset) plus
// `extraFiles` di bawah. Template premium diproteksi via entitlement.

export interface TemplateDef {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Boilerplate-generator preset that produces the base project. */
  preset: {
    stack: "next" | "vite" | "express" | "hono" | "fastapi";
    database: "none" | "postgres" | "sqlite" | "mysql";
    auth: "none" | "session" | "jwt";
    docker: boolean;
    tests: boolean;
  };
  priceIdr: number; // 0 = free
  tags: string[];
  highlights: string[];
  /** Files merged on top of the generated preset (premium only when paid). */
  extraFiles?: Record<string, string>;
}

export const TEMPLATES: TemplateDef[] = [
  {
    slug: "next-saas-starter",
    name: "Next.js SaaS Starter",
    tagline: "Starter micro-SaaS lengkap: auth, billing-ready, dashboard",
    description:
      "Proyek Next.js (App Router) siap produksi dengan autentikasi session, dashboard berbayar UI, Drizzle ORM + PostgreSQL, Tailwind, Docker, dan GitHub Actions CI. Titik mulai tercepat untuk membangun produk SaaS bulanan.",
    preset: { stack: "next", database: "postgres", auth: "session", docker: true, tests: true },
    priceIdr: 149000,
    tags: ["nextjs", "saas", "typescript", "postgres"],
    highlights: [
      "App Router + server components",
      "Auth session cookie + middleware",
      "Drizzle ORM + PostgreSQL (migrasi siap)",
      "Struktur billing (halaman upgrade)",
      "Dockerfile + GitHub Actions",
    ],
    extraFiles: {
      "README.md": [
        "# Next.js SaaS Starter (AktifKoding)",
        "",
        "Starter micro-SaaS production-ready. Struktur:",
        "",
        "- `src/app` — route groups: `(marketing)`, `(app)` dashboard",
        "- `src/db` — Drizzle schema & client (PostgreSQL)",
        "- `src/lib/auth` — session cookie passwordless",
        "- `src/app/(app)/billing` — halaman upgrade siap sambungkan payment gateway",
        "",
        "## Mulai",
        "```bash",
        "npm install",
        "cp .env.example .env   # isi DATABASE_URL",
        "npm run db:push",
        "npm run dev",
        "```",
        "",
        "## Deploy",
        "Docker Compose tersedia (`docker compose up`), atau deploy ke Vercel dan set env DATABASE_URL.",
      ].join("\n"),
    },
  },
  {
    slug: "express-clean-api",
    name: "Express Clean Architecture API",
    tagline: "REST API TypeScript dengan Clean Architecture + testing",
    description:
      "REST API Express + TypeScript memakai Clean Architecture: domain, use-case, repository, controller terpisah jelas. Lengkap dengan validasi zod, testing Vitest, rate limit, dan Docker. Cocok untuk backend freelancer & tim.",
    preset: { stack: "express", database: "postgres", auth: "jwt", docker: true, tests: true },
    priceIdr: 99000,
    tags: ["express", "typescript", "rest", "clean-architecture"],
    highlights: [
      "Layer domain / use-case / adapter / infra",
      "JWT auth + refresh token",
      "Validasi zod di setiap endpoint",
      "Vitest + supertest",
      "Docker Compose (api + postgres)",
    ],
    extraFiles: {
      "docs/ARCHITECTURE.md": [
        "# Arsitektur (Clean Architecture)",
        "",
        "``",
        "src/",
        "  domain/        entitas & aturan bisnis murni",
        "  usecases/      orkestrasi aplikasi (1 file per use case)",
        "  adapters/      controller HTTP, presenter",
        "  infra/         express app, repository Drizzle/Prisma, email",
        "``",
        "",
        "Aturan dependensi: domain tidak mengimpor apa pun dari luar; use-case hanya mengimpor domain; adapter/infra mengimpor use-case.",
      ].join("\n"),
    },
  },
  {
    slug: "next-admin-dashboard",
    name: "Next.js Admin Dashboard",
    tagline: "Dashboard admin modern dengan tabel, chart, dark mode",
    description:
      "Panel admin Next.js + Tailwind: layout sidebar responsif, tabel data server-side, komponen chart ringan, dark mode, dan halaman CRUD contoh. Gratis selamanya.",
    preset: { stack: "next", database: "sqlite", auth: "session", docker: false, tests: true },
    priceIdr: 0,
    tags: ["nextjs", "admin", "dashboard", "tailwind"],
    highlights: ["Sidebar + topbar responsif", "Tabel CRUD server-side", "Dark mode", "Gratis"],
  },
  {
    slug: "react-spa-starter",
    name: "React SPA Starter",
    tagline: "Vite + React + TypeScript + Tailwind, routing siap",
    description:
      "Single-page app dengan Vite, React Router, TypeScript strict, Tailwind, dan linting siap jalan. Ringan, tanpa backend — pas untuk tool internal & landing interaktif.",
    preset: { stack: "vite", database: "none", auth: "none", docker: false, tests: true },
    priceIdr: 0,
    tags: ["react", "vite", "spa"],
    highlights: ["Vite build super cepat", "React Router v7", "TypeScript strict", "Gratis"],
  },
  {
    slug: "hono-edge-api",
    name: "Hono Edge API",
    tagline: "API TypeScript super ringan untuk Cloudflare Workers/Vercel Edge",
    description:
      "API Hono yang jalan di edge runtime (Cloudflare Workers / Vercel Edge): cold start nyaris nol, biaya murah, lengkap dengan routing modular dan testing.",
    preset: { stack: "hono", database: "none", auth: "jwt", docker: false, tests: true },
    priceIdr: 0,
    tags: ["hono", "edge", "cloudflare", "workers"],
    highlights: ["Edge-ready (Cloudflare/Vercel)", "Routing modular", "Zod validation", "Gratis"],
  },
  {
    slug: "fastapi-service",
    name: "FastAPI Python Service",
    tagline: "Service Python modern: FastAPI + SQLAlchemy + Pydantic v2",
    description:
      "Backend Python dengan FastAPI, SQLAlchemy 2.0 async, Pydantic v2, pytest, dan Docker Compose. Ideal untuk AI/ML microservice atau API internal tim data.",
    preset: { stack: "fastapi", database: "postgres", auth: "jwt", docker: true, tests: true },
    priceIdr: 0,
    tags: ["python", "fastapi", "sqlalchemy"],
    highlights: ["Async SQLAlchemy 2.0", "Pydantic v2 settings", "pytest + httpx", "Docker Compose", "Gratis"],
  },
];

export function getTemplate(slug: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
