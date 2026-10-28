// Generator boilerplate proyek — berjalan murni dari string (tanpa fs), jadi
// aman dipakai di client maupun server. Hasil: peta { "path": "isi file" }
// yang di-zip di browser lewat jszip.

export type Stack = "next" | "vite" | "express" | "hono" | "fastapi";
export type Database = "none" | "postgres" | "sqlite" | "mysql";
export type AuthMode = "none" | "session" | "jwt";

export interface BoilerplateConfig {
  projectName: string;
  stack: Stack;
  database: Database;
  auth: AuthMode;
  docker: boolean;
  tests: boolean;
}

export function slugifyProjectName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "my-app";
}

type Files = Record<string, string>;

function packageJsonNext(c: BoilerplateConfig): string {
  const deps = [
    '"next": "^15"',
    '"react": "^19"',
    '"react-dom": "^19"',
  ];
  if (c.database === "postgres") deps.push('"drizzle-orm": "^0.36"', '"postgres": "^3"');
  if (c.database === "sqlite") deps.push('"drizzle-orm": "^0.36"', '"better-sqlite3": "^11"');
  if (c.database === "mysql") deps.push('"drizzle-orm": "^0.36"', '"mysql2": "^3"');
  if (c.auth !== "none") deps.push('"zod": "^3"');
  const dev = [
    '"@types/node": "^22"',
    '"@types/react": "^19"',
    '"typescript": "^5"',
    '"tailwindcss": "^4"',
    '"@tailwindcss/postcss": "^4"',
  ];
  if (c.tests) dev.push('"vitest": "^3"');
  if (c.database !== "none") dev.push('"drizzle-kit": "^0.28"');
  return JSON.stringify(
    {
      name: c.projectName,
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        ...(c.database !== "none" ? { "db:push": "drizzle-kit push" } : {}),
        ...(c.tests ? { test: "vitest run" } : {}),
      },
      dependencies: sortDeps(deps.join(", ")),
      devDependencies: sortDeps(dev.join(", ")),
    },
    null,
    2,
  );
}

function sortDeps(inner: string): Record<string, string> {
  if (!inner) return {};
  const obj: Record<string, string> = {};
  for (const pair of inner.split(",")) {
    const [k, v] = pair.trim().split(": ");
    obj[k] = JSON.parse(v.replace(/^"/, '"'));
  }
  return obj;
}

// ── Next.js ───────────────────────────────────────────────────────────────
function nextFiles(c: BoilerplateConfig): Files {
  const files: Files = {
    "package.json": packageJsonNext(c),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          strict: true,
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
    "postcss.config.mjs": 'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
    "src/app/layout.tsx": [
      'import type { Metadata } from "next";',
      'import "./globals.css";',
      "",
      'export const metadata: Metadata = { title: "' + c.projectName + '" };',
      "",
      "export default function RootLayout({ children }: { children: React.ReactNode }) {",
      "  return (",
      '    <html lang="id">',
      '      <body className="min-h-screen bg-background text-foreground antialiased">',
      "        {children}",
      "      </body>",
      "    </html>",
      "  );",
      "}",
    ].join("\n") + "\n",
    "src/app/page.tsx": [
      "export default function HomePage() {",
      "  return (",
      '    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">',
      '      <h1 className="text-4xl font-bold">' + c.projectName + "</h1>",
      '      <p className="text-muted-foreground">Boilerplate oleh AktifKoding Developer Tools Pro.</p>',
      "    </main>",
      "  );",
      "}",
    ].join("\n") + "\n",
    "src/app/globals.css": '@import "tailwindcss";\n',
  };

  if (c.database === "postgres" || c.database === "mysql" || c.database === "sqlite") {
    const driver =
      c.database === "postgres" ? "postgres-js" : c.database === "mysql" ? "mysql2" : "better-sqlite3";
    files["src/db/schema.ts"] = [
      'import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";',
      "",
      "// Contoh tabel — ganti sesuai kebutuhan.",
      'export const notes = sqliteTable("notes", {',
      '  id: integer("id").primaryKey({ autoIncrement: true }),',
      '  title: text("title").notNull(),',
      '  createdAt: integer("created_at").notNull(),',
      "});",
    ].join("\n") + "\n";
    files["src/db/client.ts"] = [
      'import { drizzle } from "drizzle-orm/' + driver + '";',
      'import * as schema from "./schema";',
      "",
      'const url = process.env.DATABASE_URL ?? "";',
      "export const db = drizzle(url, { schema });",
    ].join("\n") + "\n";
    files["drizzle.config.ts"] = [
      'import { defineConfig } from "drizzle-kit";',
      "",
      "export default defineConfig({",
      '  dialect: "' + (c.database === "postgres" ? "postgresql" : c.database === "mysql" ? "mysql" : "sqlite") + '",',
      '  url: process.env.DATABASE_URL ?? "",',
      '  schema: "./src/db/schema.ts",',
      "});",
    ].join("\n") + "\n";
  }

  if (c.auth === "session") {
    files["src/lib/auth.ts"] = [
      '// Session cookie sederhana — ganti dengan auth library untuk produksi.',
      'import { cookies } from "next/headers";',
      'import { createHash, randomBytes } from "crypto";',
      "",
      'export const SESSION_COOKIE = "session";',
      "",
      "export function createSessionToken(): string {",
      "  return randomBytes(32).toString(\"base64url\");",
      "}",
      "",
      "export function hashToken(token: string): string {",
      '  return createHash("sha256").update(token).digest("hex");',
      "}",
      "",
      "export async function getSessionToken(): Promise<string | undefined> {",
      '  const store = await cookies();',
      "  return store.get(SESSION_COOKIE)?.value;",
      "}",
    ].join("\n") + "\n";
  }
  if (c.auth === "jwt") {
    files["src/lib/auth.ts"] = [
      "// JWT helper (HS256) — ganti secret via env JWT_SECRET.",
      'import { createHmac, timingSafeEqual } from "crypto";',
      "",
      "const SECRET = process.env.JWT_SECRET ?? \"dev-secret\";",
      "",
      "export function signJwt(payload: Record<string, unknown>, ttlSec = 3600): string {",
      '  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");',
      "  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString(\"base64url\");",
      '  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");',
      "  return `${header}.${body}.${sig}`;",
      "}",
      "",
      "export function verifyJwt(token: string): Record<string, unknown> | null {",
      '  const [header, body, sig] = token.split(".");',
      "  if (!header || !body || !sig) return null;",
      '  const expected = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");',
      "  const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));",
      "  if (!ok) return null;",
      "  const payload = JSON.parse(Buffer.from(body, \"base64url\").toString());",
      "  if (typeof payload.exp === \"number\" && payload.exp < Date.now() / 1000) return null;",
      "  return payload;",
      "}",
    ].join("\n") + "\n";
  }

  if (c.tests) {
    files["tests/smoke.test.ts"] = [
      'import { describe, it, expect } from "vitest";',
      "",
      'describe("smoke", () => {',
      '  it("project name is wired", () => {',
      `    expect("${c.projectName}").toBeTruthy();`,
      "  });",
      "});",
    ].join("\n") + "\n";
    files["vitest.config.ts"] = 'import { defineConfig } from "vitest/config";\n\nexport default defineConfig({});\n';
  }

  return files;
}

// ── Vite SPA ──────────────────────────────────────────────────────────────
function viteFiles(c: BoilerplateConfig): Files {
  const files: Files = {
    "package.json": JSON.stringify(
      {
        name: c.projectName,
        private: true,
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc -b && vite build",
          preview: "vite preview",
          ...(c.tests ? { test: "vitest run" } : {}),
        },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-router": "^7.0.0" },
        devDependencies: {
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          "@vitejs/plugin-react": "^4.3.0",
          typescript: "^5.6.0",
          vite: "^6.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0",
          ...(c.tests ? { vitest: "^3.0.0" } : {}),
        },
      },
      null,
      2,
    ),
    "vite.config.ts": [
      'import { defineConfig } from "vite";',
      'import react from "@vitejs/plugin-react";',
      'import tailwindcss from "@tailwindcss/vite";',
      "",
      "export default defineConfig({",
      '  plugins: [react(), tailwindcss()],',
      "});",
    ].join("\n") + "\n",
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
    "index.html": [
      "<!doctype html>",
      '<html lang="id">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `    <title>${c.projectName}</title>`,
      "  </head>",
      "  <body>",
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      "  </body>",
      "</html>",
    ].join("\n") + "\n",
    "src/main.tsx": [
      'import { StrictMode } from "react";',
      'import { createRoot } from "react-dom/client";',
      'import { BrowserRouter, Routes, Route } from "react-router";',
      'import App from "./App";',
      'import "./index.css";',
      "",
      "createRoot(document.getElementById(\"root\")!).render(",
      "  <StrictMode>",
      "    <BrowserRouter>",
      "      <Routes>",
      '        <Route path="/*" element={<App />} />',
      "      </Routes>",
      "    </BrowserRouter>",
      "  </StrictMode>,",
      ");",
    ].join("\n") + "\n",
    "src/App.tsx": [
      "export default function App() {",
      "  return (",
      '    <main className="flex min-h-screen items-center justify-center">',
      '      <h1 className="text-4xl font-bold">' + c.projectName + "</h1>",
      "    </main>",
      "  );",
      "}",
    ].join("\n") + "\n",
    "src/index.css": '@import "tailwindcss";\n',
  };
  if (c.tests) {
    files["tests/smoke.test.ts"] = [
      'import { describe, it, expect } from "vitest";',
      "",
      'describe("smoke", () => {',
      '  it("passes", () => { expect(true).toBe(true); });',
      "});",
    ].join("\n") + "\n";
  }
  return files;
}

// ── Express ───────────────────────────────────────────────────────────────
function expressFiles(c: BoilerplateConfig): Files {
  const files: Files = {
    "package.json": JSON.stringify(
      {
        name: c.projectName,
        private: true,
        type: "module",
        scripts: {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
          ...(c.tests ? { test: "vitest run" } : {}),
        },
        dependencies: {
          express: "^5.0.0",
          ...(c.database === "postgres" ? { postgres: "^3" } : {}),
          ...(c.database === "sqlite" ? { "better-sqlite3": "^11" } : {}),
          ...(c.database === "mysql" ? { mysql2: "^3" } : {}),
          ...(c.auth === "jwt" ? { jose: "^5" } : {}),
          zod: "^3.24.0",
        },
        devDependencies: {
          "@types/express": "^5.0.0",
          "@types/node": "^22",
          tsx: "^4",
          typescript: "^5.6",
          ...(c.tests ? { vitest: "^3", supertest: "^7", "@types/supertest": "^6" } : {}),
        },
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          outDir: "dist",
          strict: true,
          esModuleInterop: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
    "src/index.ts": [
      'import express from "express";',
      'import { healthRouter } from "./routes/health";',
      "",
      "const app = express();",
      "app.use(express.json());",
      "",
      'app.use("/api", healthRouter);',
      "",
      "const port = Number(process.env.PORT ?? 3000);",
      "app.listen(port, () => {",
      '  console.log(`API ready on :${port}`);',
      "});",
    ].join("\n") + "\n",
    "src/routes/health.ts": [
      'import { Router } from "express";',
      "",
      'export const healthRouter = Router();',
      "",
      'healthRouter.get("/health", (_req, res) => {',
      '  res.json({ ok: true, ts: Date.now() });',
      "});",
    ].join("\n") + "\n",
  };
  if (c.auth === "jwt") {
    files["src/middleware/auth.ts"] = [
      'import type { NextFunction, Request, Response } from "express";',
      'import { jwtVerify } from "jose";',
      "",
      'const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret");',
      "",
      "export async function requireJwt(req: Request, res: Response, next: NextFunction) {",
      '  const header = req.headers.authorization ?? "";',
      '  if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });',
      "  try {",
      '    const { payload } = await jwtVerify(header.slice(7), SECRET);',
      '    (req as Request & { user?: unknown }).user = payload;',
      "    next();",
      "  } catch {",
      '    res.status(401).json({ error: "unauthorized" });',
      "  }",
      "}",
    ].join("\n") + "\n";
  }
  if (c.database !== "none") {
    files["src/db/client.ts"] = [
      "// Ganti driver sesuai DATABASE_URL Anda.",
      "// postgres: import postgres from \"postgres\"; export const sql = postgres(process.env.DATABASE_URL!);",
      "// sqlite:   import Database from \"better-sqlite3\"; export const db = new Database(process.env.DB_FILE ?? \"data.db\");",
      'export const placeholder = "configure-your-driver";',
    ].join("\n") + "\n";
  }
  if (c.tests) {
    files["tests/health.test.ts"] = [
      'import { describe, it, expect } from "vitest";',
      'import request from "supertest";',
      'import express from "express";',
      'import { healthRouter } from "../src/routes/health";',
      "",
      'describe("GET /api/health", () => {',
      '  it("returns ok", async () => {',
      "    const app = express();",
      '    app.use("/api", healthRouter);',
      '    const res = await request(app).get("/api/health");',
      "    expect(res.status).toBe(200);",
      '    expect(res.body.ok).toBe(true);',
      "  });",
      "});",
    ].join("\n") + "\n";
    files["vitest.config.ts"] = 'import { defineConfig } from "vitest/config";\n\nexport default defineConfig({});\n';
  }
  return files;
}

// ── Hono ──────────────────────────────────────────────────────────────────
function honoFiles(c: BoilerplateConfig): Files {
  const files: Files = {
    "package.json": JSON.stringify(
      {
        name: c.projectName,
        private: true,
        scripts: {
          dev: "wrangler dev",
          deploy: "wrangler deploy",
          ...(c.tests ? { test: "vitest run" } : {}),
        },
        dependencies: { hono: "^4" },
        devDependencies: { wrangler: "^3", "@cloudflare/workers-types": "^4", ...(c.tests ? { vitest: "^3" } : {}) },
      },
      null,
      2,
    ),
    "wrangler.toml": [
      'name = "' + c.projectName + '"',
      'main = "src/index.ts"',
      'compatibility_date = "2024-12-01"',
    ].join("\n") + "\n",
    "src/index.ts": [
      'import { Hono } from "hono";',
      "",
      "const app = new Hono();",
      "",
      'app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));',
      "",
      "export default app;",
    ].join("\n") + "\n",
  };
  if (c.auth === "jwt") {
    files["src/middleware/auth.ts"] = [
      'import { jwt } from "hono/jwt";',
      "",
      "// Set JWT_SECRET di wrangler secrets untuk produksi.",
      'export const requireJwt = jwt({ secret: process.env.JWT_SECRET ?? "dev-secret" });',
    ].join("\n") + "\n";
  }
  if (c.tests) {
    files["tests/index.test.ts"] = [
      'import { describe, it, expect } from "vitest";',
      'import app from "../src/index";',
      "",
      'describe("GET /api/health", () => {',
      '  it("returns ok", async () => {',
      '    const res = await app.request("/api/health");',
      "    expect(res.status).toBe(200);",
      "  });",
      "});",
    ].join("\n") + "\n";
  }
  return files;
}

// ── FastAPI ───────────────────────────────────────────────────────────────
function fastapiFiles(c: BoilerplateConfig): Files {
  const files: Files = {
    "pyproject.toml": [
      "[project]",
      `name = "${c.projectName}"`,
      'version = "0.1.0"',
      'requires-python = ">=3.11"',
      "dependencies = [",
      '  "fastapi>=0.115",',
      '  "uvicorn[standard]>=0.32",',
      '  "pydantic-settings>=2",',
      ...(c.database === "postgres" ? ['  "sqlalchemy[asyncio]>=2.0",', '  "asyncpg>=0.30",'] : []),
      ...(c.database === "sqlite" ? ['  "sqlalchemy[asyncio]>=2.0",', '  "aiosqlite>=0.20",'] : []),
      ...(c.database === "mysql" ? ['  "sqlalchemy[asyncio]>=2.0",', '  "aiomysql>=0.2",'] : []),
      ...(c.auth === "jwt" ? ['  "pyjwt>=2.9",'] : []),
      ...(c.tests ? ['  "pytest>=8",', '  "httpx>=0.27",'] : []),
      "]",
    ].join("\n") + "\n",
    "src/main.py": [
      "from fastapi import FastAPI",
      "",
      'app = FastAPI(title="' + c.projectName + '")',
      "",
      "",
      '@app.get("/api/health")',
      "def health() -> dict:",
      '    return {"ok": True}',
    ].join("\n") + "\n",
    "src/config.py": [
      "from pydantic_settings import BaseSettings",
      "",
      "",
      "class Settings(BaseSettings):",
      "    database_url: str = \"\"",
      "    jwt_secret: str = \"dev-secret\"",
      "",
      "    class Config:",
      '        env_file = ".env"',
      "",
      "",
      "settings = Settings()",
    ].join("\n") + "\n",
  };
  if (c.auth === "jwt") {
    files["src/auth.py"] = [
      "import time",
      "import jwt",
      "from .config import settings",
      "",
      "",
      "def sign_token(sub: str, ttl: int = 3600) -> str:",
      '    now = int(time.time())',
      '    return jwt.encode({"sub": sub, "exp": now + ttl}, settings.jwt_secret, algorithm="HS256")',
      "",
      "",
      "def verify_token(token: str) -> dict | None:",
      "    try:",
      '        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])',
      "    except jwt.PyJWTError:",
      "        return None",
    ].join("\n") + "\n";
    files["src/__init__.py"] = "";
  }
  if (c.tests) {
    files["tests/test_health.py"] = [
      "from fastapi.testclient import TestClient",
      "",
      "from src.main import app",
      "",
      "client = TestClient(app)",
      "",
      "",
      "def test_health():",
      '    res = client.get("/api/health")',
      "    assert res.status_code == 200",
      '    assert res.json()["ok"] is True',
    ].join("\n") + "\n";
  }
  return files;
}

export function generateBoilerplate(c: BoilerplateConfig): Files {
  const files =
    c.stack === "next"
      ? nextFiles(c)
      : c.stack === "vite"
        ? viteFiles(c)
        : c.stack === "express"
          ? expressFiles(c)
          : c.stack === "hono"
            ? honoFiles(c)
            : fastapiFiles(c);

  const out: Files = { ...files };

  out[".env.example"] = envExample(c);
  out[".gitignore"] = gitignore(c.stack);
  out["README.md"] = readme(c, Object.keys(files));

  if (c.docker) {
    const d = dockerFiles(c);
    for (const [k, v] of Object.entries(d)) out[k] = v;
  }

  return out;
}

function envExample(c: BoilerplateConfig): string {
  const lines: string[] = ["# AktifKoding boilerplate — isi sesuai kebutuhan"];
  if (c.database !== "none") {
    const url: Record<Exclude<Database, "none">, string> = {
      postgres: "DATABASE_URL=postgresql://user:pass@localhost:5432/" + c.projectName,
      sqlite: "DATABASE_URL=file:./data.db",
      mysql: "DATABASE_URL=mysql://user:pass@localhost:3306/" + c.projectName,
    };
    lines.push(url[c.database]);
  }
  if (c.auth !== "none") lines.push("JWT_SECRET=ubah-ini-jadi-string-acak-panjang");
  return lines.join("\n") + "\n";
}

function gitignore(stack: Stack): string {
  const common = ["node_modules/", ".env", "dist/", "*.log", ".DS_Store"];
  if (stack === "next") common.push(".next/");
  if (stack === "fastapi") common.push("__pycache__/", ".venv/", "data.db");
  return common.join("\n") + "\n";
}

function readme(c: BoilerplateConfig, files: string[]): string {
  const runByStack: Record<Stack, string> = {
    next: "npm install\nnpm run dev",
    vite: "npm install\nnpm run dev",
    express: "npm install\nnpm run dev",
    hono: "npm install\nnpm run dev",
    fastapi: "uvicorn src.main:app --reload",
  };
  const run =
    c.stack === "fastapi"
      ? "python -m venv .venv && source .venv/bin/activate\npip install -e .\nuvicorn src.main:app --reload"
      : runByStack[c.stack];
  return [
    `# ${c.projectName}`,
    "",
    "Boilerplate dihasilkan oleh **AktifKoding Developer Tools Pro**.",
    "",
    "## Stack",
    `- Framework: ${c.stack}`,
    `- Database: ${c.database}`,
    `- Auth: ${c.auth}`,
    `- Docker: ${c.docker ? "ya" : "tidak"}`,
    `- Tests: ${c.tests ? "ya" : "tidak"}`,
    "",
    "## Mulai",
    "```bash",
    run,
    "```",
    "",
    "## Struktur file",
    ...Object.values(files)
      .slice(0, 40)
      .map((f) => `- \`${f}\``),
    "",
  ].join("\n");
}

// ── Docker (dipakai generator deployment juga) ────────────────────────────
export function dockerFiles(c: { projectName: string; stack: Stack; database: Database }): Files {
  const nodeStacks: Stack[] = ["next", "vite", "express", "hono"];
  const files: Files = {};

  if (nodeStacks.includes(c.stack)) {
    files["Dockerfile"] = [
      "FROM node:22-alpine AS deps",
      "WORKDIR /app",
      "COPY package*.json ./",
      "RUN npm ci",
      "",
      "FROM node:22-alpine AS build",
      "WORKDIR /app",
      "COPY --from=deps /app/node_modules ./node_modules",
      "COPY . .",
      c.stack === "next" ? "RUN npm run build" : "RUN npm run build || true",
      "",
      "FROM node:22-alpine",
      "WORKDIR /app",
      "ENV NODE_ENV=production",
      "COPY --from=build /app ./",
      c.stack === "next" ? "EXPOSE 3000\nCMD [\"npm\", \"start\"]" : `EXPOSE 3000\nCMD ["npm", "run", "dev"]`,
    ].join("\n") + "\n";
  } else {
    files["Dockerfile"] = [
      "FROM python:3.12-slim",
      "WORKDIR /app",
      "COPY pyproject.toml ./",
      "RUN pip install --no-cache-dir .",
      "COPY src ./src",
      "EXPOSE 8000",
      'CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]',
    ].join("\n") + "\n";
  }

  files[".dockerignore"] = ["node_modules", ".git", ".env", "dist", ".next", "__pycache__"].join("\n") + "\n";

  const dbService =
    c.database === "postgres"
      ? [
          "  db:",
          "    image: postgres:17-alpine",
          "    environment:",
          "      POSTGRES_USER: app",
          "      POSTGRES_PASSWORD: app",
          "      POSTGRES_DB: " + c.projectName,
          "    ports:",
          '      - "5432:5432"',
          "    volumes:",
          "      - pgdata:/var/lib/postgresql/data",
        ]
      : c.database === "mysql"
        ? [
            "  db:",
            "    image: mysql:9",
            "    environment:",
            "      MYSQL_USER: app",
            "      MYSQL_PASSWORD: app",
            "      MYSQL_ROOT_PASSWORD: root",
            "      MYSQL_DATABASE: " + c.projectName,
            "    ports:",
            '      - "3306:3306"',
          ]
        : null;

  files["docker-compose.yml"] = [
    "services:",
    "  app:",
    "    build: .",
    "    ports:",
    `      - "${c.stack === "fastapi" ? "8000" : "3000"}:${c.stack === "fastapi" ? "8000" : "3000"}"`,
    "    env_file: .env",
    ...(dbService ? ["  " + dbService.join("\n  ")] : []),
    ...(dbService ? ["", "volumes:", "  pgdata:"] : []),
  ].join("\n") + "\n";

  return files;
}
