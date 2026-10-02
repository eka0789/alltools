export interface StackPreset {
  slug: string;
  name: string;
  tokens: string[];
  description: string;
}

export const STACKS: StackPreset[] = [
  { slug: "react", name: "React", tokens: ["react"], description: "The most popular UI library and its ecosystem." },
  { slug: "nextjs", name: "Next.js", tokens: ["next.js", "nextjs", "react", "tailwind", "typescript", "trpc", "vercel", "shadcn", "prisma", "drizzle"], description: "Full-stack React framework tooling." },
  { slug: "typescript", name: "TypeScript", tokens: ["typescript"], description: "Typed JavaScript tooling and libraries." },
  { slug: "laravel", name: "Laravel", tokens: ["laravel", "php"], description: "The PHP framework and its ecosystem." },
  { slug: "python", name: "Python", tokens: ["python"], description: "Python language, web frameworks and tooling." },
  { slug: "nodejs", name: "Node.js", tokens: ["node.js", "nodejs"], description: "Server-side JavaScript runtime ecosystem." },
  { slug: "go", name: "Go", tokens: ["go", "golang"], description: "Go language tooling and libraries." },
  { slug: "java", name: "Java", tokens: ["java", "spring", "jvm"], description: "Java and the JVM ecosystem." },
  { slug: "rust", name: "Rust", tokens: ["rust"], description: "Rust language tooling and libraries." },
  { slug: "flutter", name: "Flutter", tokens: ["flutter", "dart"], description: "Cross-platform apps from a single codebase." },
  { slug: "docker", name: "Docker", tokens: ["docker", "containers"], description: "Container development and deployment." },
  { slug: "kubernetes", name: "Kubernetes", tokens: ["kubernetes", "k8s"], description: "Container orchestration ecosystem." },
  { slug: "postgresql", name: "PostgreSQL", tokens: ["postgres", "postgresql", "pg"], description: "Postgres databases, clients and tooling." },
  { slug: "devops", name: "DevOps", tokens: ["devops", "ci-cd", "iac"], description: "CI/CD, infrastructure as code and operations." },
];

export interface StackSection {
  key: string;
  label: string;
  tools: { slug: string; name: string; description: string }[];
}

const SECTION_ORDER = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "deployment", label: "Deployment & DevOps" },
  { key: "testing", label: "Testing" },
  { key: "monitoring", label: "Monitoring" },
  { key: "ai", label: "AI" },
  { key: "mobile", label: "Mobile" },
  { key: "other", label: "Utilities & More" },
] as const;

const CATEGORY_TO_SECTION: Record<string, string> = {
  frontend: "frontend",
  css: "frontend",
  color: "frontend",
  design: "frontend",
  backend: "backend",
  api: "backend",
  database: "database",
  sql: "database",
  devops: "deployment",
  cloud: "deployment",
  git: "deployment",
  testing: "testing",
  monitoring: "monitoring",
  ai: "ai",
  mobile: "mobile",
};

interface MatchableTool {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  tags: string[];
  languages: string[];
  frameworks: string[];
}

export function matchStack(
  tokens: string[],
  pool: MatchableTool[],
  maxPerSection = 12,
): StackSection[] {
  const normalizedTokens = tokens.map((t) => t.toLowerCase());
  const sections = new Map<string, MatchableTool[]>();

  for (const tool of pool) {
    const haystack = new Set(
      [tool.categorySlug, ...tool.tags, ...tool.languages, ...tool.frameworks].map(
        (t) => t.toLowerCase(),
      ),
    );
    const nameLower = tool.name.toLowerCase();
    const matches = normalizedTokens.some(
      (tok) => haystack.has(tok) || haystack.has(`${tok}-compatible`) || nameLower === tok,
    );
    if (!matches) continue;
    const section = CATEGORY_TO_SECTION[tool.categorySlug] ?? "other";
    const list = sections.get(section) ?? [];
    if (list.length < maxPerSection) list.push(tool);
    sections.set(section, list);
  }

  return SECTION_ORDER.filter((s) => sections.has(s.key)).map((s) => ({
    key: s.key,
    label: s.label,
    tools: (sections.get(s.key) ?? []).map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
    })),
  }));
}
