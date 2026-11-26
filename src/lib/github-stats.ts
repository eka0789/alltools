import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tools } from "@/db/schema";

// Admin-triggered GitHub enrichment (OPs center). Mirrors
// scripts/fetch-github-stats.mjs at a tiny batch size so it can run inside a
// request. Uses GITHUB_TOKEN when present (60 req/h unauthenticated vs 5000
// authenticated) and only touches tools whose stars are still null.

export interface GithubRepo {
  owner: string;
  repo: string;
}

export function parseGithubRepo(url: string): GithubRepo | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    // Skip non-repo GitHub paths.
    if (["orgs", "users", "topics", "collections", "sponsors", "features"].includes(owner)) {
      return null;
    }
    return { owner, repo };
  } catch {
    return null;
  }
}

export interface GithubBatchResult {
  checked: number;
  updated: number;
  failed: number;
}

export async function refreshGithubStatsBatch(limit = 8): Promise<GithubBatchResult> {
  const rows = await db
    .select({ id: tools.id, githubUrl: tools.githubUrl })
    .from(tools)
    .where(
      and(
        sql`${tools.deletedAt} IS NULL`,
        sql`${tools.githubUrl} IS NOT NULL`,
        isNull(tools.githubStars),
      ),
    )
    .limit(limit);

  const token = process.env.GITHUB_TOKEN?.trim();
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const repo = row.githubUrl ? parseGithubRepo(row.githubUrl) : null;
    if (!repo) {
      failed += 1;
      continue;
    }
    try {
      const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        failed += 1;
        continue;
      }
      const data = (await res.json()) as {
        stargazers_count?: number;
        pushed_at?: string;
        license?: { spdx_id?: string | null } | null;
      };
      await db
        .update(tools)
        .set({
          githubStars:
            typeof data.stargazers_count === "number" ? data.stargazers_count : null,
          githubPushedAt: data.pushed_at ? Date.parse(data.pushed_at) : null,
          githubLicense: data.license?.spdx_id ?? null,
          updatedAt: Date.now(),
        })
        .where(eq(tools.id, row.id));
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { checked: rows.length, updated, failed };
}
