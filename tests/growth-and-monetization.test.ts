import { describe, expect, it } from "vitest";
import { calculateCouponDiscount, normalizeCouponCode } from "@/lib/coupons";
import { resolveSafeGithubRawUrl } from "@/app/api/review/route";
import {
  canonicalCompareSlug,
  getTopComparePairs,
  parseComparePair,
} from "@/lib/compare-seo";
import { rateLimitPersistent } from "@/lib/rate-limit";

describe("Promo coupons", () => {
  it("normalizes coupon codes to uppercase alphanumeric", () => {
    expect(normalizeCouponCode("  launch-20! ")).toBe("LAUNCH-20");
    expect(normalizeCouponCode("promo_50")).toBe("PROMO_50");
  });

  it("calculates percent and fixed discounts while respecting min Rp 1.000 floor", () => {
    const pct = calculateCouponDiscount(299_000, {
      discountType: "percent",
      discountValue: 20,
    });
    expect(pct.discountAmount).toBe(59_800);
    expect(pct.finalAmount).toBe(239_200);

    const fixed = calculateCouponDiscount(50_000, {
      discountType: "fixed",
      discountValue: 15_000,
    });
    expect(fixed.discountAmount).toBe(15_000);
    expect(fixed.finalAmount).toBe(35_000);

    // Huge fixed discount still leaves >= Rp 1.000 for DOKU
    const floored = calculateCouponDiscount(2_000, {
      discountType: "fixed",
      discountValue: 100_000,
    });
    expect(floored.finalAmount).toBe(1_000);
    expect(floored.discountAmount).toBe(1_000);
  });
});

describe("AI Code Review GitHub/Gist URL resolver (SSRF guard)", () => {
  it("converts public GitHub blob and Gist URLs to raw URLs", () => {
    expect(
      resolveSafeGithubRawUrl("https://github.com/vercel/next.js/blob/canary/package.json"),
    ).toBe("https://raw.githubusercontent.com/vercel/next.js/canary/package.json");

    expect(
      resolveSafeGithubRawUrl("https://gist.github.com/octocat/6cad326836d38bd3a7ae"),
    ).toBe("https://gist.githubusercontent.com/octocat/6cad326836d38bd3a7ae/raw");

    expect(
      resolveSafeGithubRawUrl("https://raw.githubusercontent.com/a/b/main/index.ts"),
    ).toBe("https://raw.githubusercontent.com/a/b/main/index.ts");
  });

  it("rejects non-https, internal IPs, and arbitrary domains", () => {
    expect(resolveSafeGithubRawUrl("http://169.254.169.254/latest/meta-data/")).toBeNull();
    expect(resolveSafeGithubRawUrl("https://localhost:3000/api/admin")).toBeNull();
    expect(resolveSafeGithubRawUrl("https://evil.example.com/script.js")).toBeNull();
    expect(resolveSafeGithubRawUrl("not-a-url")).toBeNull();
  });
});

describe("Programmatic SEO compare pairs", () => {
  it("generates unique canonical pairs from catalog alternatives", () => {
    const pairs = getTopComparePairs(30);
    expect(pairs.length).toBeGreaterThan(10);

    const seen = new Set<string>();
    for (const p of pairs) {
      expect(seen.has(p.pair)).toBe(false);
      seen.add(p.pair);
      expect(p.pair).toBe(canonicalCompareSlug(p.toolA.slug, p.toolB.slug));
    }
  });

  it("parses canonical and non-canonical pairs accurately, even with hyphenated slugs", () => {
    const first = getTopComparePairs(1)[0];
    expect(first).toBeDefined();

    const parsed = parseComparePair(first.pair);
    expect(parsed).not.toBeNull();
    expect(parsed?.isCanonical).toBe(true);
    expect(parsed?.toolA.slug).toBe(first.toolA.slug);
    expect(parsed?.toolB.slug).toBe(first.toolB.slug);

    const reversed = `${first.toolB.slug}-vs-${first.toolA.slug}`;
    const parsedRev = parseComparePair(reversed);
    expect(parsedRev).not.toBeNull();
    expect(parsedRev?.isCanonical).toBe(false);
    expect(parsedRev?.pair).toBe(first.pair);

    expect(parseComparePair("nonexistent-a-vs-nonexistent-b")).toBeNull();
  });
});

describe("Persistent rate limiter", () => {
  it("enforces fixed-window limits and reports retryAfter", async () => {
    const key = `test-rl-${Date.now()}-${Math.random()}`;
    const r1 = await rateLimitPersistent(key, 2, 60_000);
    const r2 = await rateLimitPersistent(key, 2, 60_000);
    const r3 = await rateLimitPersistent(key, 2, 60_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfter).toBeGreaterThan(0);
  });
});
