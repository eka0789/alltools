// Pembuat dokumentasi API: daftar endpoint → dokumentasi Markdown + OpenAPI
// 3.1 (YAML). Inference JSON contoh → schema OpenAPI sederhana. Murni string,
// jalan di browser.

export interface ApiEndpointInput {
  method: string; // GET | POST | PUT | PATCH | DELETE
  path: string; // /users/{id}
  summary: string;
  auth: boolean;
  /** { "path": [{name, required, type}], "query": [...], "body": json-string } */
  pathParams: { name: string; type: string; required: boolean }[];
  queryParams: { name: string; type: string; required: boolean; description: string }[];
  requestBodyJson: string;
  responseJson: string;
  responseStatus: number;
  description: string;
}

export const EMPTY_ENDPOINT: ApiEndpointInput = {
  method: "GET",
  path: "/users/{id}",
  summary: "Ambil detail pengguna",
  auth: false,
  pathParams: [{ name: "id", type: "integer", required: true }],
  queryParams: [],
  requestBodyJson: "",
  responseJson: '{\n  "id": 1,\n  "name": "Budi",\n  "email": "budi@example.com"\n}',
  responseStatus: 200,
  description: "",
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function inferSchemaFromJson(jsonStr: string): { schema: Record<string, unknown> | null; example: unknown | null } {
  if (!jsonStr.trim()) return { schema: null, example: null };
  try {
    const value = JSON.parse(jsonStr) as unknown;
    return { schema: jsonToOpenApi(value), example: value };
  } catch {
    return { schema: null, example: null };
  }
}

function jsonToOpenApi(value: unknown): Record<string, unknown> {
  if (value === null) return { type: "string", nullable: true };
  if (Array.isArray(value)) {
    const first = value[0];
    return { type: "array", items: first === undefined ? {} : jsonToOpenApi(first) };
  }
  if (typeof value === "object") {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      props[k] = jsonToOpenApi(v);
    }
    return { type: "object", properties: props };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
  }
  if (typeof value === "boolean") return { type: "boolean" };
  return { type: "string" };
}

// ── OpenAPI 3.1 ───────────────────────────────────────────────────────────

export function generateOpenApi(
  endpoints: ApiEndpointInput[],
  meta: { title: string; version: string; serverUrl: string; bearer: boolean },
): string {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const ep of endpoints) {
    const op: Record<string, unknown> = {
      summary: ep.summary || `${ep.method} ${ep.path}`,
      description: ep.description || undefined,
      responses: {},
    };
    const params: unknown[] = [
      ...ep.pathParams.map((p) => ({
        name: p.name,
        in: "path",
        required: p.required,
        schema: { type: p.type || "string" },
      })),
      ...ep.queryParams.map((p) => ({
        name: p.name,
        in: "query",
        required: p.required,
        description: p.description || undefined,
        schema: { type: p.type || "string" },
      })),
    ];
    if (params.length > 0) op.parameters = params;
    if (ep.auth) op.security = [{ bearerAuth: [] }];
    const req = inferSchemaFromJson(ep.requestBodyJson);
    if (req.schema && ep.method !== "GET" && ep.method !== "DELETE") {
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: req.schema } },
      };
    }
    const res = inferSchemaFromJson(ep.responseJson);
    op.responses = {
      [String(ep.responseStatus || 200)]: {
        description: "Sukses",
        ...(res.schema
          ? { content: { "application/json": { schema: res.schema, example: res.example ?? undefined } } }
          : {}),
      },
    };
    const pathKey = ep.path.startsWith("/") ? ep.path : `/${ep.path}`;
    (paths[pathKey] ??= {})[ep.method.toLowerCase()] = op;
  }

  const doc = {
    openapi: "3.1.0",
    info: { title: meta.title || "API", version: meta.version || "1.0.0" },
    servers: meta.serverUrl ? [{ url: meta.serverUrl }] : undefined,
    components: meta.bearer
      ? { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } }
      : undefined,
    paths,
  };
  // stringify-then-yaml kecil: gunakan emitter sederhana
  return emitYaml(doc);
}

function emitYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === undefined) return "";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => `\n${pad}- ${emitYaml(item, indent + 1).trimStart()}`).join("");
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "{}";
  return entries
    .map(([k, v]) => {
      const nested = v !== null && typeof v === "object";
      const val = nested ? emitYaml(v, indent + 1) : emitYaml(v, 0);
      return `\n${pad}${k}:${nested ? val : ` ${val.trimStart()}`}`;
    })
    .join("");
}

// ── Markdown ──────────────────────────────────────────────────────────────
export function generateApiMarkdown(
  endpoints: ApiEndpointInput[],
  meta: { title: string; serverUrl: string; bearer: boolean },
): string {
  const lines: string[] = [
    `# ${meta.title || "Dokumentasi API"}`,
    "",
    meta.serverUrl ? `Base URL: \`${meta.serverUrl}\`` : "",
    meta.bearer
      ? "Autentikasi: `Authorization: Bearer <token>` pada setiap request yang dilindungi."
      : "",
    "",
  ];
  lines.push("| Method | Endpoint | Auth |", "|---|---|---|");
  for (const ep of endpoints) {
    lines.push(`| \`${ep.method}\` | \`${ep.path}\` | ${ep.auth ? "✅ Bearer" : "—"} |`);
  }
  lines.push("");
  for (const ep of endpoints) {
    lines.push(
      `## ${ep.method} ${ep.path}`,
      "",
      ep.summary,
      "",
    );
    if (ep.description) lines.push(ep.description, "");
    if (ep.pathParams.length > 0) {
      lines.push("**Path parameters**", "");
      lines.push("| Nama | Tipe | Wajib |", "|---|---|---|");
      for (const p of ep.pathParams) lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? "ya" : "tidak"} |`);
      lines.push("");
    }
    if (ep.queryParams.length > 0) {
      lines.push("**Query parameters**", "");
      lines.push("| Nama | Tipe | Wajib | Keterangan |", "|---|---|---|---|");
      for (const p of ep.queryParams)
        lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? "ya" : "tidak"} | ${p.description} |`);
      lines.push("");
    }
    if (ep.requestBodyJson.trim() && ep.method !== "GET" && ep.method !== "DELETE") {
      lines.push("**Request body**", "", "```json", ep.requestBodyJson.trim(), "```", "");
    }
    if (ep.auth) {
      lines.push("**Headers**", "", "```", "Authorization: Bearer <token>", "```", "");
    }
    lines.push(`**Response ${ep.responseStatus || 200}**`, "");
    if (ep.responseJson.trim()) {
      lines.push("```json", ep.responseJson.trim(), "```", "");
    }
  }
  return lines.filter((l) => l !== "").join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

export { METHODS };
