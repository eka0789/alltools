import { describe, expect, it } from "vitest";
import catalogJson from "@/data/catalog.generated.json";
import { EDITORIAL } from "@/data/editorial";
import { ALL_SEED_TOOLS } from "@/data/tools";
import { slugify } from "@/lib/slug";
import { normalizeUrlKey } from "@/lib/data";
import type { Pricing } from "@/data/types";

// Seed/export integrity: ALL_SEED_TOOLS is what gets seeded (and what
// npm run validate checks), while catalog.generated.json is the cold-start
// snapshot every serverless instance serves. Both are checked here.

function seedSlug(t: { slug?: string; n: string }): string {
  return t.slug ?? slugify(t.n);
}

interface RawTool {
  slug: string;
  name: string;
  description: string;
  url: string;
  categoryId: number;
  pricing: string;
  platforms?: string;
  status?: string;
  pros?: string;
  cons?: string;
}

interface RawCategory {
  id: number;
  slug: string;
  name: string;
}

const catalog = catalogJson as unknown as {
  tools: RawTool[];
  categories: RawCategory[];
};

const VALID_PRICING: Pricing[] = ["free", "freemium", "paid"];
const VALID_STATUS = new Set(["active", "deprecated", "needs_review"]);

describe("bundled catalog", () => {
  it("has unique tool slugs", () => {
    const slugs = catalog.tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique website URLs after normalization", () => {
    const keys = catalog.tools.map((t) => normalizeUrlKey(t.url));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("references only known categories", () => {
    const catIds = new Set(catalog.categories.map((c) => c.id));
    expect(catalog.tools.every((t) => catIds.has(t.categoryId))).toBe(true);
  });

  it("only uses valid pricing and status values", () => {
    for (const t of catalog.tools) {
      expect(VALID_PRICING).toContain(t.pricing);
      expect(VALID_STATUS.has(t.status ?? "active")).toBe(true);
    }
  });

  it("gives every active tool a name, description and URL", () => {
    for (const t of catalog.tools) {
      if (t.status === "deprecated") continue;
      expect(t.name.trim().length, `name: ${t.slug}`).toBeGreaterThan(0);
      expect(t.description.trim().length, `description: ${t.slug}`).toBeGreaterThan(0);
      expect(t.url.startsWith("https://"), `url: ${t.slug}`).toBe(true);
    }
  });

  it("ships pros/cons as valid JSON string arrays when present", () => {
    for (const t of catalog.tools) {
      if (t.pros === undefined && t.cons === undefined) continue;
      const pros = t.pros ? (JSON.parse(t.pros) as string[]) : [];
      const cons = t.cons ? (JSON.parse(t.cons) as string[]) : [];
      expect(Array.isArray(pros), `pros: ${t.slug}`).toBe(true);
      expect(Array.isArray(cons), `cons: ${t.slug}`).toBe(true);
    }
  });
});

describe("seed source (ALL_SEED_TOOLS)", () => {
  it("has unique slugs", () => {
    const slugs = ALL_SEED_TOOLS.map(seedSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("covers at least 100 tools with pros/cons decision aids", () => {
    const seedSlugs = new Set(ALL_SEED_TOOLS.map(seedSlug));
    const covered = [...Object.keys(EDITORIAL)].filter((s) => seedSlugs.has(s));
    expect(covered.length).toBeGreaterThanOrEqual(100);
  });
});

describe("editorial decision aids", () => {
  it("only references slugs that exist in the seed source", () => {
    const slugs = new Set(ALL_SEED_TOOLS.map(seedSlug));
    const unknown = Object.keys(EDITORIAL).filter((s) => !slugs.has(s));
    expect(unknown).toEqual([]);
  });

  it("never leaves an entry with pros but no cons (or vice versa)", () => {
    for (const [slug, entry] of Object.entries(EDITORIAL)) {
      expect(entry.pros.length, slug).toBeGreaterThan(0);
      expect(entry.cons.length, slug).toBeGreaterThan(0);
    }
  });
});
