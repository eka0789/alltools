"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = [
  "React", "Next.js", "TypeScript", "Vue", "Tailwind", "Node.js",
  "Laravel", "Python", "Django", "Go", "Java", "Rust", "Flutter",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Prisma",
  "Docker", "Kubernetes", "AWS", "Vercel", "GraphQL", "AI coding",
];

const TOKEN_MAP: Record<string, string> = {
  react: "react",
  "next.js": "next.js",
  typescript: "typescript",
  vue: "vue",
  tailwind: "tailwind",
  "node.js": "node.js",
  laravel: "laravel",
  python: "python",
  django: "django",
  go: "golang",
  java: "java",
  rust: "rust",
  flutter: "flutter",
  postgresql: "postgresql",
  mysql: "mysql",
  mongodb: "mongodb",
  redis: "redis",
  supabase: "supabase",
  prisma: "prisma",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  vercel: "vercel",
  graphql: "graphql",
  "ai coding": "ai-coding",
};

export function StackPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(option: string) {
    setSelected((s) =>
      s.includes(option) ? s.filter((o) => o !== option) : [...s, option],
    );
  }

  function go() {
    const tokens = selected.map((o) => TOKEN_MAP[o.toLowerCase()] ?? o.toLowerCase());
    router.push(`/stacks/custom?stacks=${encodeURIComponent(tokens.join(","))}`);
  }

  return (
    <div className="card p-5">
      <p className="text-sm text-muted-foreground">
        Select the technologies you use (2–4 gives the best results):
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={go} disabled={selected.length === 0} className="btn-primary disabled:opacity-50">
          Build my toolbox ({selected.length})
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
