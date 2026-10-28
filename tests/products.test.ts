import { describe, expect, it } from "vitest";
import {
  LIFETIME_PRODUCT,
  TEAM_PRODUCT,
  TEMPLATE_PRODUCTS,
  formatIdr,
  getProduct,
} from "@/lib/products";
import { TEMPLATES, getTemplate } from "@/data/templates";

describe("products catalog", () => {
  it("lifetime & team products exist with IDR prices", () => {
    expect(LIFETIME_PRODUCT.priceIdr).toBeGreaterThan(0);
    expect(TEAM_PRODUCT.seats).toBeGreaterThan(1);
  });

  it("premium templates become purchasable products with matching ids", () => {
    for (const p of TEMPLATE_PRODUCTS) {
      expect(p.kind).toBe("template");
      expect(p.id.startsWith("tpl:")).toBe(true);
      const template = getTemplate(p.templateSlug!);
      expect(template).toBeDefined();
      expect(template!.priceIdr).toBe(p.priceIdr);
    }
  });

  it("every product id resolves via getProduct", () => {
    expect(getProduct(LIFETIME_PRODUCT.id)).toBeDefined();
    expect(getProduct(TEAM_PRODUCT.id)).toBeDefined();
    expect(getProduct("tpl:unknown-template")).toBeUndefined();
  });

  it("formatIdr renders rupiah", () => {
    expect(formatIdr(299000)).toContain("299");
  });
});

describe("templates data integrity", () => {
  it("slugs are unique and presets are valid", () => {
    const slugs = TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of TEMPLATES) {
      expect(["next", "vite", "express", "hono", "fastapi"]).toContain(t.preset.stack);
      expect(["none", "postgres", "sqlite", "mysql"]).toContain(t.preset.database);
      expect(["none", "session", "jwt"]).toContain(t.preset.auth);
      expect(t.priceIdr).toBeGreaterThanOrEqual(0);
    }
  });
});
