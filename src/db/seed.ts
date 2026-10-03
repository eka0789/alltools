import { db, DB_IS_REMOTE } from "./client";
import { categories, subcategories, tags, tools, linkChecks } from "./schema";
import { CATEGORIES } from "../data/categories";
import { ALL_SEED_TOOLS } from "../data/tools";
import type { Pricing } from "../data/types";
import { slugify } from "../lib/slug";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Existing seed entries that are currently trending on GitHub — the seeder
// appends the "trending" tag so the homepage section picks them up.
const TRENDING_SLUGS = new Set([
  // pre-existing catalog entries
  "ollama", "vllm", "langfuse", "qdrant", "openhands", "excalidraw",
  "tldraw", "penpot", "coolify", "pocketbase", "supabase", "neon",
  "turso", "htmx", "astro", "solidjs", "drizzle-orm", "tanstack",
  // expansion entries (trending open source)
  "bun", "deno", "hono", "biome", "rspack", "turborepo", "tauri",
  "uv", "ruff", "mise", "zellij", "atuin", "just", "maestro",
  "meilisearch", "typesense", "valkey", "dragonflydb", "surrealdb",
  "minio", "mailpit", "better-auth", "scalar", "json-crack",
  "dify", "flowise", "n8n", "langgraph", "crewai", "autogen",
  "llama-cpp", "comfyui", "stable-diffusion-webui", "whisper",
  "gemini-cli", "codex-cli", "goose", "plausible", "umami", "signoz",
  "polars", "nx",
]);

const reset = process.argv.includes("--reset");

// Objective GitHub signals captured by scripts/fetch-github-stats.mjs. The
// file is optional — entries stay null (never invented) until real data
// lands for a repo.
let githubStats: Record<string, { stars?: number; pushedAt?: number; license?: string }> = {};
try {
  const statsPath = fileURLToPath(new URL("../../data/github-stats.json", import.meta.url));
  githubStats = JSON.parse(readFileSync(statsPath, "utf8"));
} catch {
  // no stats file yet
}

async function main() {
  const existing = await db.select({ id: tools.id }).from(tools);
  if (existing.length > 0 && !reset) {
    console.error(
      `Database already has ${existing.length} tools. Use --reset to wipe and reseed.`,
    );
    process.exit(1);
  }

  console.log("Seeding AllTools database...");

  await db.delete(linkChecks);
  await db.delete(tools);
  await db.delete(subcategories);
  await db.delete(categories);
  await db.delete(tags);

  // Categories & subcategories
  const catIdBySlug = new Map<string, number>();
  const subIdBySlug = new Map<string, number>(); // key: `${catSlug}/${subSlug}`
  let homeOrder = 0;
  for (const [i, cat] of CATEGORIES.entries()) {
    if (cat.home) homeOrder += 1;
    const res = await db
      .insert(categories)
      .values({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        homeOrder: cat.home ? homeOrder : null,
        sortOrder: i,
      });
    const catId = Number(res.lastInsertRowid);
    catIdBySlug.set(cat.slug, catId);
    for (const [j, sub] of (cat.subs ?? []).entries()) {
      const sres = await db
        .insert(subcategories)
        .values({
          categoryId: catId,
          slug: sub.slug,
          name: sub.name,
          sortOrder: j,
        });
      subIdBySlug.set(`${cat.slug}/${sub.slug}`, Number(sres.lastInsertRowid));
    }
  }

  // Tools
  const slugCounts = new Map<string, number>();
  const generatedSlugs = new Set<string>();
  for (const t of ALL_SEED_TOOLS) {
    const slug = t.slug ?? slugify(t.n);
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    if (slugCounts.get(slug)! > 1) {
      console.error(`Duplicate tool slug from name "${t.n}": ${slug}`);
      process.exit(1);
    }
    generatedSlugs.add(slug);
  }

  const tagSet = new Map<string, string>();
  let inserted = 0;

  // Deterministic "added" dates. Real acquisition dates don't exist for
  // curated entries, and anchoring them to `now` reshuffled "Recently added"
  // and every sitemap lastModified on each deploy. A fixed epoch keeps them
  // stable; newer entries still sort after older ones.
  const SEED_EPOCH_MS = Date.UTC(2026, 0, 1);

  for (const [i, t] of ALL_SEED_TOOLS.entries()) {
    const catId = catIdBySlug.get(t.c);
    if (!catId) {
      console.error(`Tool "${t.n}" references unknown category "${t.c}"`);
      process.exit(1);
    }
    let subId: number | null = null;
    if (t.s) {
      subId = subIdBySlug.get(`${t.c}/${t.s}`) ?? null;
      if (subId === null) {
        console.error(
          `Tool "${t.n}" references unknown subcategory "${t.s}" in category "${t.c}"`,
        );
        process.exit(1);
      }
    }

    const slug = t.slug ?? slugify(t.n);
    const entryTags = [...(t.t ?? [])];
    if (TRENDING_SLUGS.has(slug) && !entryTags.includes("trending")) {
      entryTags.push("trending");
    }
    const pick = (slugs: string[] | undefined) =>
      (slugs ?? []).filter((s) => {
        if (generatedSlugs.has(s)) return true;
        console.warn(`  [${t.n}] dropping unknown slug reference: ${s}`);
        return false;
      });

    for (const tag of entryTags) tagSet.set(slugify(tag), tag);

    const createdAt = SEED_EPOCH_MS + i * 3 * 60 * 60 * 1000; // stable, staggered 3h apart
    const stats = githubStats[slug];
    await db.insert(tools)
      .values({
        name: t.n,
        slug,
        url: t.u,
        description: t.d,
        logo: new URL(t.u).hostname,
        categoryId: catId,
        subcategoryId: subId,
        tags: JSON.stringify(entryTags),
        pricing: (t.p ?? "free") satisfies Pricing,
        openSource: !!t.oss,
        selfHosted: !!t.sh,
        githubUrl: t.gh ?? null,
        documentationUrl: t.docs ?? null,
        platforms: JSON.stringify(t.plat ?? []),
        languages: JSON.stringify(t.langs ?? []),
        frameworks: JSON.stringify(t.fw ?? []),
        useCases: JSON.stringify(t.use ?? []),
        alternatives: JSON.stringify(pick(t.alt)),
        relatedTools: JSON.stringify(pick(t.rel)),
        featured: !!t.feat,
        githubStars: typeof stats?.stars === "number" ? stats.stars : null,
        githubPushedAt: typeof stats?.pushedAt === "number" ? stats.pushedAt : null,
        githubLicense: typeof stats?.license === "string" ? stats.license : null,
        createdAt,
        updatedAt: createdAt,
      });
    inserted += 1;
  }

  for (const [slug, name] of tagSet) {
    await db.insert(tags).values({ slug, name });
  }

  console.log(
    `Seeded ${inserted} tools, ${CATEGORIES.length} categories, ${tagSet.size} tags.`,
  );

  // Fold the WAL back into the main db file so CI/serverless builds that
  // only trace *.db still get every seeded row. Remote databases have no
  // local WAL — skip.
  if (!DB_IS_REMOTE) {
    try {
      (db.$client as import("better-sqlite3").Database).pragma(
        "wal_checkpoint(TRUNCATE)",
      );
    } catch {
      // read-only or WAL-less environment: nothing to fold
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
