import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/auth";
import { escapeHtml } from "@/lib/email";
import { signUnsubscribe, unsubscribeUrl, verifyUnsubscribeSignature } from "@/lib/newsletter";
import { generateBoilerplate } from "@/lib/generators/boilerplate";
import { heuristicReview } from "@/lib/ai-review";
import { getTemplate } from "@/data/templates";
import { buildHref, activeFilterChips } from "@/components/filters";

describe("auth redirect sanitizer", () => {
  it("allows safe relative paths and rejects open redirects", () => {
    expect(sanitizeNextPath("/pricing")).toBe("/pricing");
    expect(sanitizeNextPath("/checkout/AK-20261124-1234AB")).toBe("/checkout/AK-20261124-1234AB");
    expect(sanitizeNextPath("https://evil.com")).toBeNull();
    expect(sanitizeNextPath("//evil.com/phish")).toBeNull();
    expect(sanitizeNextPath("/\\evil.com")).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
  });
});

describe("newsletter HMAC unsubscribe & HTML escaping", () => {
  it("generates and verifies signed unsubscribe URLs", () => {
    const email = "dev@aktifkoding.biz.id";
    const sig = signUnsubscribe(email);
    expect(verifyUnsubscribeSignature(email, sig)).toBe(true);
    expect(verifyUnsubscribeSignature("other@example.com", sig)).toBe(false);
    expect(verifyUnsubscribeSignature(email, "tampered")).toBe(false);
    const url = unsubscribeUrl(email);
    expect(url).toContain("/api/newsletter/unsubscribe?email=");
    expect(url).toContain("&sig=");
  });

  it("escapes dangerous HTML characters", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("boilerplate dialect accuracy & premium templates", () => {
  it("generates pgTable for postgres and mysqlTable for mysql", () => {
    const pg = generateBoilerplate({
      projectName: "demo-pg",
      stack: "next",
      database: "postgres",
      auth: "session",
      docker: true,
      tests: true,
    });
    expect(pg["src/db/schema.ts"]).toContain("pgTable");
    expect(pg["src/db/schema.ts"]).not.toContain("sqliteTable");
    expect(pg["drizzle.config.ts"]).toContain("dbCredentials");

    const my = generateBoilerplate({
      projectName: "demo-my",
      stack: "next",
      database: "mysql",
      auth: "none",
      docker: false,
      tests: false,
    });
    expect(my["src/db/schema.ts"]).toContain("mysqlTable");
    expect(my["src/db/client.ts"]).toContain("mysql2/promise");
  });

  it("premium templates include rich production code files", () => {
    const saas = getTemplate("next-saas-starter");
    expect(Object.keys(saas?.extraFiles ?? {}).length).toBeGreaterThanOrEqual(6);
    expect(saas?.extraFiles?.["src/middleware.ts"]).toContain("saas_session");

    const clean = getTemplate("express-clean-api");
    expect(Object.keys(clean?.extraFiles ?? {}).length).toBeGreaterThanOrEqual(7);
    expect(clean?.extraFiles?.["src/usecases/create-user.ts"]).toContain("CreateUserUseCase");
  });
});

describe("search active filter chip removal", () => {
  it("passing chip.patch directly to buildHref clears the active filter", () => {
    const params = { q: "api", category: "database", pricing: "free" };
    const chips = activeFilterChips({ category: "database", pricing: "free" });
    const catChip = chips.find((c) => c.label.startsWith("Category:"))!;
    const cleared = buildHref(params, catChip.patch, "/search");
    expect(cleared).toBe("/search?q=api&pricing=free");
  });
});

describe("AI review v2 line numbers and suggestions", () => {
  it("reports line number and fix suggestion for heuristic findings", () => {
    const res = heuristicReview('const a = 1;\nconst x = eval("2+2");\n', "javascript");
    const evalFinding = res.findings.find((f) => f.title.includes("eval"));
    expect(evalFinding?.line).toBe(2);
    expect(evalFinding?.suggestion).toContain("JSON.parse");
  });
});
