// Curated starter-pack collections — editorial groupings of catalog slugs.
// Every slug is validated against the live catalog at render time; unknown
// slugs are dropped, never invented.

export interface Collection {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  emoji: string;
  tools: string[];
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "frontend-starter",
    title: "Frontend Starter Pack",
    tagline: "Everything to build and ship a modern web UI",
    description:
      "The core toolkit for a frontend developer in 2026: a framework, styling, quality gates, and deployment — proven choices rather than hype.",
    emoji: "🎨",
    tools: [
      "nextjs", "react", "vite", "typescript", "tailwindcss", "storybook",
      "vitest", "playwright", "eslint", "prettier", "vercel", "figma",
    ],
  },
  {
    slug: "backend-api",
    title: "Backend & API Essentials",
    tagline: "APIs, databases, auth, and the tools to keep them honest",
    description:
      "From designing and testing endpoints to the database GUI and ORM you'll live in — the working set of a backend engineer.",
    emoji: "🛠️",
    tools: [
      "fastapi", "django", "laravel", "nestjs", "hono", "postgresql",
      "prisma", "drizzle-orm", "redis", "postman", "bruno", "insomnia",
      "better-auth", "kong",
    ],
  },
  {
    slug: "ai-toolkit",
    title: "AI & LLM Toolkit",
    tagline: "Run, build, and ship with local and hosted AI",
    description:
      "Local model runners, LLM app frameworks, vector stores, and workflow builders — the fastest path from idea to AI-powered product.",
    emoji: "🤖",
    tools: [
      "ollama", "langchain", "hugging-face", "dify", "flowise", "n8n",
      "qdrant", "weaviate", "chroma", "pinecone", "cursor", "github-copilot",
      "continue", "aider",
    ],
  },
  {
    slug: "devops-infrastructure",
    title: "DevOps & Infrastructure",
    tagline: "Containerize, deploy, monitor — keep it running",
    description:
      "The self-hosting and operations starter kit: containers, deployment platforms, reverse proxies, and the monitoring stack that catches issues first.",
    emoji: "♾️",
    tools: [
      "docker", "kubernetes", "terraform", "coolify", "portainer", "caddy",
      "nginx", "prometheus", "grafana", "sentry", "github", "cloudflare",
    ],
  },
  {
    slug: "data-analytics",
    title: "Data & Analytics",
    tagline: "From raw data to dashboards people read",
    description:
      "Notebooks, query GUIs, pipeline orchestration, and BI tools — the toolbox of analysts and data engineers.",
    emoji: "📊",
    tools: [
      "jupyter", "pandas", "postgresql", "pgadmin", "tableplus", "dbeaver",
      "metabase", "airflow", "dagster", "dbt", "meilisearch", "typesense",
    ],
  },
  {
    slug: "developer-quality-of-life",
    title: "Developer Quality of Life",
    tagline: "Small tools that compound into big focus",
    description:
      "Terminals, notes, diagrams, and the little utilities experienced developers refuse to work without.",
    emoji: "🧰",
    tools: [
      "vscode", "warp", "iterm2", "windows-terminal", "tmux", "zellij",
      "neovim", "obsidian", "notion", "excalidraw", "raycast", "git",
      "gitkraken", "pnpm",
    ],
  },
];
