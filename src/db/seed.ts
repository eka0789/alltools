import { db } from "./client";
import { categories, subcategories, tags, tools, linkChecks } from "./schema";
import { CATEGORIES } from "../data/categories";
import { ALL_SEED_TOOLS } from "../data/tools";
import type { Pricing } from "../data/types";
import { slugify } from "../lib/slug";

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

function main() {
  const existing = db.select({ id: tools.id }).from(tools).all();
  if (existing.length > 0 && !reset) {
    console.error(
      `Database already has ${existing.length} tools. Use --reset to wipe and reseed.`,
    );
    process.exit(1);
  }

  console.log("Seeding AllTools database...");

  db.delete(linkChecks).run();
  db.delete(tools).run();
  db.delete(subcategories).run();
  db.delete(categories).run();
  db.delete(tags).run();

  // Categories & subcategories
  const catIdBySlug = new Map<string, number>();
  const subIdBySlug = new Map<string, number>(); // key: `${catSlug}/${subSlug}`
  let homeOrder = 0;
  CATEGORIES.forEach((cat, i) => {
    if (cat.home) homeOrder += 1;
    const res = db
      .insert(categories)
      .values({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        homeOrder: cat.home ? homeOrder : null,
        sortOrder: i,
      })
      .run();
    const catId = Number(res.lastInsertRowid);
    catIdBySlug.set(cat.slug, catId);
    (cat.subs ?? []).forEach((sub, j) => {
      const sres = db
        .insert(subcategories)
        .values({
          categoryId: catId,
          slug: sub.slug,
          name: sub.name,
          sortOrder: j,
        })
        .run();
      subIdBySlug.set(`${cat.slug}/${sub.slug}`, Number(sres.lastInsertRowid));
    });
  });

  // Tools
  const slugCounts = new Map<string, number>();
  const generatedSlugs = new Set<string>();
  for (const t of ALL_SEED_TOOLS) {
    let slug = t.slug ?? slugify(t.n);
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    if (slugCounts.get(slug)! > 1) {
      console.error(`Duplicate tool slug from name "${t.n}": ${slug}`);
      process.exit(1);
    }
    generatedSlugs.add(slug);
  }

  const now = Date.now();
  const total = ALL_SEED_TOOLS.length;
  const tagSet = new Map<string, string>();
  let inserted = 0;

  ALL_SEED_TOOLS.forEach((t, i) => {
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

    const createdAt = now - (total - i) * 3 * 60 * 60 * 1000; // staggered 3h apart
    db.insert(tools)
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
        createdAt,
        updatedAt: createdAt,
      })
      .run();
    inserted += 1;
  });

  for (const [slug, name] of tagSet) {
    db.insert(tags).values({ slug, name }).run();
  }

  console.log(
    `Seeded ${inserted} tools, ${CATEGORIES.length} categories, ${tagSet.size} tags.`,
  );

  // Fold the WAL back into the main db file so CI/serverless builds that
  // only trace *.db still get every seeded row.
  try {
    (db.$client as import("better-sqlite3").Database).pragma(
      "wal_checkpoint(TRUNCATE)",
    );
  } catch {
    // read-only or WAL-less environment: nothing to fold
  }
}

main();
