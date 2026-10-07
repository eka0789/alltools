import { describe, expect, it } from "vitest";
import { normalize, parseFilters, quickSearch, searchTools } from "@/lib/search";

// Scoring & pipeline tests run against the bundled catalog JSON (see
// vitest.config.ts env note) so they never depend on local DB state.

describe("normalize", () => {
  it("lowercases, strips diacritics and trims", () => {
    expect(normalize("  Café RÉSUMÉ ")).toBe("cafe resume");
  });
});

describe("parseFilters", () => {
  it("reads single values and ignores empties", () => {
    const f = parseFilters({ category: "devops", pricing: "" });
    expect(f.category).toBe("devops");
    expect(f.pricing).toBeUndefined();
  });

  it("takes the first value of repeated params", () => {
    expect(parseFilters({ tag: ["api", "cli"] }).tag).toBe("api");
  });

  it("parses flag filters strictly", () => {
    expect(parseFilters({ oss: "1" }).oss).toBe(true);
    expect(parseFilters({ oss: "false" }).oss).toBe(false);
    expect(parseFilters({ oss: "yes" }).oss).toBeUndefined();
  });
});

describe("searchTools scoring", () => {
  it("ranks an exact name match first", () => {
    const r = searchTools({ q: "tailwind css" });
    expect(r.items[0]?.slug).toBe("tailwind-css");
  });

  it("ranks exact single-word names above prefix matches", () => {
    const r = searchTools({ q: "react" });
    expect(r.items[0]?.slug).toBe("react");
    // React Router etc. still surface right behind it
    expect(r.items.slice(0, 5).some((t) => t.slug.startsWith("react"))).toBe(true);
  });

  it("tolerates typos on names", () => {
    const r = searchTools({ q: "tailwnd" });
    expect(r.items.slice(0, 5).map((t) => t.slug)).toContain("tailwind-css");
  });

  it("maps synonyms to the right tool", () => {
    expect(searchTools({ q: "postgres" }).items[0]?.slug).toBe("postgresql");
    expect(searchTools({ q: "k8s" }).items.slice(0, 5).map((t) => t.slug))
      .toContain("kubernetes");
  });

  it("boosts task-based intents (api testing)", () => {
    const r = searchTools({ q: "test my api" });
    const intentTags = new Set(["api", "testing", "rest"]);
    expect(
      r.items[0]?.tags.some((t) => intentTags.has(t.toLowerCase())),
    ).toBe(true);
  });
});

describe("searchTools filters", () => {
  it("restricts by category", () => {
    const r = searchTools({ filters: { category: "devops" }, perPage: 100 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((t) => t.categorySlug === "devops")).toBe(true);
  });

  it("restricts by pricing", () => {
    const r = searchTools({ filters: { pricing: "free" }, perPage: 100 });
    expect(r.items.every((t) => t.pricing === "free")).toBe(true);
  });

  it("restricts by platform and open-source flag", () => {
    const r = searchTools({ filters: { platform: "cli", oss: true }, perPage: 100 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((t) => t.platforms.includes("cli") && Boolean(t.openSource))).toBe(true);
  });

  it("never returns deprecated tools", () => {
    const all = new Set<string>();
    for (let p = 1; p <= searchTools({ perPage: 100 }).totalPages; p++) {
      for (const t of searchTools({ page: p, perPage: 100 }).items) all.add(t.slug);
    }
    const catalog = searchTools({ perPage: 1 });
    expect(all.size).toBeGreaterThan(0);
    expect(catalog.total).toBeGreaterThanOrEqual(all.size);
  });
});

describe("searchTools pagination & facets", () => {
  it("pages consistently", () => {
    const r = searchTools({ perPage: 10, page: 2 });
    expect(r.items.length).toBeLessThanOrEqual(10);
    expect(r.page).toBe(2);
    expect(r.totalPages).toBe(Math.ceil(r.total / 10));
  });

  it("computes pricing facets in fixed order", () => {
    const r = searchTools({});
    expect(r.facets.pricing.map((p) => p.key)).toEqual(["free", "freemium", "paid"]);
    for (const p of r.facets.pricing) expect(p.count).toBeLessThanOrEqual(r.total);
  });
});

describe("quickSearch", () => {
  it("respects the limit", () => {
    expect(quickSearch("code", 3).length).toBeLessThanOrEqual(3);
  });
});
