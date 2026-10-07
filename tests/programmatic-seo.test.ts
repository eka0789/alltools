import { describe, expect, it } from "vitest";
import {
  getSeoLandingPage,
  getSeoLandingPages,
  SEO_MODIFIERS,
} from "@/lib/programmatic-seo";

describe("programmatic SEO landing pages", () => {
  it("generates a substantial set of valid landing pages (≥50)", () => {
    const pages = getSeoLandingPages();
    expect(pages.length).toBeGreaterThanOrEqual(50);
  });

  it("every page has at least 3 tools", () => {
    const pages = getSeoLandingPages();
    for (const p of pages) {
      expect(p.tools.length, p.url).toBeGreaterThanOrEqual(3);
      expect(p.total).toBe(p.tools.length);
    }
  });

  it("produces valid URLs, titles and non-empty meta descriptions", () => {
    const pages = getSeoLandingPages();
    for (const p of pages) {
      expect(p.url.startsWith("/best/")).toBe(true);
      expect(p.title.length).toBeGreaterThan(15);
      expect(p.metaDescription.length).toBeGreaterThan(40);
    }
  });

  it("returns null for non-existent category or modifier", () => {
    expect(getSeoLandingPage("non-existent-cat", "free")).toBeNull();
    expect(getSeoLandingPage("frontend", "non-existent-mod")).toBeNull();
  });

  it("resolves specific high-value targets", () => {
    const feOss = getSeoLandingPage("frontend", "open-source");
    expect(feOss).not.toBeNull();
    expect(feOss?.tools.length).toBeGreaterThanOrEqual(20);

    const devopsCli = getSeoLandingPage("devops", "cli");
    expect(devopsCli).not.toBeNull();
    expect(devopsCli?.tools.length).toBeGreaterThanOrEqual(3);
  });

  it("all modifiers have active filters", () => {
    expect(SEO_MODIFIERS.length).toBeGreaterThanOrEqual(5);
    for (const m of SEO_MODIFIERS) {
      expect(typeof m.filter).toBe("function");
    }
  });
});
