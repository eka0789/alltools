import { describe, expect, it } from "vitest";
import { CORS_HEADERS, slimTool } from "@/lib/public-api";
import { getToolBySlug } from "@/lib/data";

// Shape lock for the public API: consumers (and the MCP server) rely on
// these field names — a regression here is a breaking API change.

const FIXTURE = {
  slug: "fixture",
  name: "Fixture",
  description: "A fixture tool",
  url: "https://example.com",
  categorySlug: "devops",
  categoryName: "DevOps",
  subcategorySlug: null,
  tags: ["fixture"],
  pricing: "free" as const,
  openSource: 1,
  selfHosted: 0,
  platforms: ["web"],
  languages: [],
  frameworks: [],
  useCases: [],
  pros: ["good"],
  cons: ["bad"],
  installCommand: "npm i fixture",
  githubUrl: "https://github.com/x/fixture",
  githubStars: 1234,
  githubPushedAt: 1759000000000,
  documentationUrl: "https://example.com/docs",
  alternatives: [],
  relatedTools: [],
  verified: 1,
  lastVerifiedAt: 1759000000000,
  clicks: 7,
  createdAt: 1700000000000,
  updatedAt: 1759000000000,
} as unknown as Parameters<typeof slimTool>[0];

describe("slimTool", () => {
  it("projects exactly the documented fields", () => {
    const keys = Object.keys(slimTool(FIXTURE)).sort();
    expect(keys).toEqual(
      [
        "alternatives",
        "category",
        "categoryName",
        "clicks",
        "cons",
        "createdAt",
        "detailUrl",
        "description",
        "documentationUrl",
        "frameworks",
        "githubStars",
        "githubUrl",
        "githubPushedAt",
        "installCommand",
        "languages",
        "lastVerifiedAt",
        "name",
        "openSource",
        "platforms",
        "pricing",
        "pros",
        "relatedTools",
        "selfHostable",
        "slug",
        "subcategory",
        "tags",
        "updatedAt",
        "url",
        "useCases",
        "verified",
      ].sort(),
    );
  });

  it("converts epoch millis to ISO strings and nulls", () => {
    const out = slimTool(FIXTURE);
    expect(out.createdAt).toBe("2023-11-14T22:13:20.000Z");
    expect(out.githubPushedAt).toBe("2025-09-27T19:06:40.000Z");
    const noDates = slimTool({ ...FIXTURE, githubPushedAt: null, lastVerifiedAt: 0 });
    expect(noDates.githubPushedAt).toBeNull();
    expect(noDates.lastVerifiedAt).toBeNull();
  });

  it("maps internal names to public names", () => {
    const out = slimTool(FIXTURE);
    expect(out.category).toBe("devops"); // not categorySlug
    expect(out.selfHostable).toBe(0); // not selfHosted
    expect(out.detailUrl).toBe("/tools/fixture");
  });

  it("projects editorial arrays on real tools", () => {
    const docker = getToolBySlug("docker");
    if (!docker) throw new Error("docker missing from catalog");
    const out = slimTool(docker);
    // The bundled cold-start snapshot may predate an editorial merge, so
    // only the array shape is asserted here — coverage itself is locked by
    // tests/catalog-integrity.test.ts against the seed source.
    expect(Array.isArray(out.pros)).toBe(true);
    expect(Array.isArray(out.cons)).toBe(true);
    expect(out.clicks).toBeGreaterThanOrEqual(0);
  });
});

describe("CORS", () => {
  it("allows public browser consumption", () => {
    expect(CORS_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
    expect(CORS_HEADERS["Access-Control-Allow-Methods"]).toContain("GET");
  });
});
