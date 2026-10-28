import { createHash, createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { heuristicReview } from "@/lib/ai-review";
import { generateApiMarkdown, generateOpenApi } from "@/lib/generators/api-docs";
import { generateBoilerplate, slugifyProjectName } from "@/lib/generators/boilerplate";
import { generateDeployConfig } from "@/lib/generators/deploy";

describe("ai-review heuristics", () => {
  it("flags eval as critical", () => {
    const r = heuristicReview('const x = eval(userInput);', "javascript");
    expect(r.engine).toBe("heuristic");
    expect(r.findings.some((f) => f.title.includes("eval"))).toBe(true);
    expect(r.findings.find((f) => f.title.includes("eval"))?.severity).toBe("critical");
  });

  it("clean code gets high score and no criticals", () => {
    const r = heuristicReview(
      "function add(a: number, b: number): number {\n  return a + b;\n}",
      "typescript",
    );
    expect(r.findings.every((f) => f.severity !== "critical")).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it("detects hardcoded secrets", () => {
    const r = heuristicReview('const apiKey = "sk-1234567890abcdef1234";', "javascript");
    expect(r.findings.some((f) => f.title.toLowerCase().includes("kredensial"))).toBe(true);
  });
});

describe("api-docs generator", () => {
  const endpoint = {
    method: "POST",
    path: "/users",
    summary: "Buat pengguna",
    auth: true,
    pathParams: [],
    queryParams: [{ name: "dryRun", type: "boolean", required: false, description: "uji tanpa simpan" }],
    requestBodyJson: '{ "name": "Budi", "age": 30, "tags": ["dev"] }',
    responseJson: '{ "id": 1, "name": "Budi" }',
    responseStatus: 201,
    description: "",
  };

  it("produces valid OpenAPI YAML with inferred schemas", () => {
    const yaml = generateOpenApi([endpoint], {
      title: "Test API",
      version: "1.0.0",
      serverUrl: "https://api.test",
      bearer: true,
    });
    expect(yaml).toContain('openapi: "3.1.0"');
    expect(yaml).toContain("/users");
    expect(yaml).toContain("bearerAuth");
    expect(yaml).toContain('type: "object"');
  });

  it("produces markdown with table of contents", () => {
    const md = generateApiMarkdown([endpoint], { title: "Test API", serverUrl: "https://api.test", bearer: true });
    expect(md).toContain("## POST /users");
    expect(md).toContain("```json");
    expect(md).toContain("Bearer");
  });

  it("tolerates invalid JSON input gracefully", () => {
    const yaml = generateOpenApi(
      [{ ...endpoint, requestBodyJson: "{not-json" }],
      { title: "T", version: "1", serverUrl: "", bearer: false },
    );
    expect(yaml).toContain('openapi: "3.1.0"');
  });
});

describe("boilerplate generator", () => {
  it("generates runnable file sets for each stack", () => {
    for (const stack of ["next", "vite", "express", "hono", "fastapi"] as const) {
      const files = generateBoilerplate({
        projectName: "demo",
        stack,
        database: "postgres",
        auth: "jwt",
        docker: true,
        tests: true,
      });
      expect(files["package.json"] ?? files["pyproject.toml"]).toBeTruthy();
      expect(files["README.md"]).toBeTruthy();
      expect(files[".env.example"]).toBeTruthy();
      if (stack !== "fastapi") expect(files["Dockerfile"]).toBeTruthy();
    }
  });

  it("docker toggle adds compose with db service", () => {
    const files = generateBoilerplate({
      projectName: "demo",
      stack: "express",
      database: "postgres",
      auth: "none",
      docker: true,
      tests: false,
    });
    expect(files["docker-compose.yml"]).toContain("postgres:17-alpine");
  });

  it("slugifies project names", () => {
    expect(slugifyProjectName("My Cool App!!")).toBe("my-cool-app");
    expect(slugifyProjectName("")).toBe("my-app");
  });
});

describe("deploy config generator", () => {
  it("vercel target yields vercel.json without docker", () => {
    const files = generateDeployConfig({
      projectName: "demo",
      stack: "node",
      target: "vercel",
      database: "none",
      ci: "github-actions",
      domain: "",
    });
    expect(files.some((f) => f.path === "vercel.json")).toBe(true);
    expect(files.some((f) => f.path === "Dockerfile")).toBe(false);
  });

  it("vps-docker target yields dockerfile, compose, proxies", () => {
    const files = generateDeployConfig({
      projectName: "demo",
      stack: "python",
      target: "vps-docker",
      database: "postgres",
      ci: "github-actions",
      domain: "app.example.com",
    });
    const paths = files.map((f) => f.path);
    expect(paths).toContain("Dockerfile");
    expect(paths).toContain("docker-compose.yml");
    expect(paths).toContain("nginx.conf");
    expect(paths).toContain("Caddyfile");
    const compose = files.find((f) => f.path === "docker-compose.yml")!;
    expect(compose.content).toContain("postgres:17-alpine");
  });
});

// Signature scheme (format resmi DOKU non-SNAP): stringToSign = baris
// "Name:value" di-join "\n" (tanpa trailing newline), Digest = base64 sha256
// body (hanya POST), header Signature: HMACSHA256=<base64>.
import { verifyDokuSignature } from "@/lib/doku";

function sign(config: { secretKey: string }, sts: string): string {
  return createHmac("sha256", config.secretKey).update(sts).digest("base64");
}

describe("doku signature verification", () => {
  const config = { clientId: "CID", secretKey: "SK-test", baseUrl: "https://api-sandbox.doku.com" };
  const raw = JSON.stringify({ order: { invoice_number: "AK-1", amount: 1 } });
  const digest = createHash("sha256").update(raw).digest("base64");
  const sts =
    `Client-Id:CID\nRequest-Id:rid-1\nRequest-Timestamp:2026-10-28T10:00:00Z\nRequest-Target:/api/payments/doku/notify\nDigest:${digest}`;
  const sig = sign(config, sts);

  it("accepts a correctly signed notification", () => {
    const ok = verifyDokuSignature(
      config,
      {
        "client-id": "CID",
        "request-id": "rid-1",
        "request-timestamp": "2026-10-28T10:00:00Z",
        signature: `HMACSHA256=${sig}`,
      },
      "/api/payments/doku/notify",
      raw,
    );
    expect(ok).toBe(true);
  });

  it("rejects a tampered body", () => {
    const ok = verifyDokuSignature(
      config,
      {
        "client-id": "CID",
        "request-id": "rid-1",
        "request-timestamp": "2026-10-28T10:00:00Z",
        signature: `HMACSHA256=${sig}`,
      },
      "/api/payments/doku/notify",
      JSON.stringify({ order: { invoice_number: "AK-1", amount: 999999 } }),
    );
    expect(ok).toBe(false);
  });

  it("rejects missing headers", () => {
    const ok = verifyDokuSignature(config, { signature: `HMACSHA256=${sig}` }, "/x", raw);
    expect(ok).toBe(false);
  });
});
