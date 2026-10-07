import { NextRequest, NextResponse } from "next/server";
import { getCatalog, getToolBySlug } from "@/lib/data";
import { searchTools } from "@/lib/search";
import { GLOSSARY } from "@/data/glossary";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal stateless MCP (Model Context Protocol) server over Streamable
// HTTP. Lets Claude Desktop, Cursor, Cline and other MCP clients query the
// AllTools catalog and glossary directly from the IDE. JSON-RPC 2.0 wire
// format, plain-JSON responses (the spec allows completing a request with
// application/json when no streaming is needed).

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "alltools",
  title: "AllTools — The Developer Dictionary",
  version: "1.0.0",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

function rpcResult(id: unknown, result: unknown): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: CORS_HEADERS },
  );
}

function rpcError(id: unknown, code: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: 200, headers: CORS_HEADERS },
  );
}

const TOOL_DEFS = [
  {
    name: "search_tools",
    description:
      "Search the AllTools catalog of 800+ curated developer tools. Supports fuzzy matching, synonyms and task-based queries like 'test rest api' or 'convert json to typescript'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (tool name, task, or keyword)" },
        category: { type: "string", description: "Optional category slug filter (e.g. 'database', 'frontend')" },
        pricing: { type: "string", enum: ["free", "freemium", "paid"], description: "Optional pricing filter" },
        limit: { type: "number", description: "Max results, 1-25 (default 8)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_tool",
    description:
      "Get full details for one tool by slug: description, pricing, pros/cons, install command, GitHub stats, alternatives.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Tool slug, e.g. 'next-js'" } },
      required: ["slug"],
    },
  },
  {
    name: "list_categories",
    description: "List all catalog categories with tool counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "lookup_term",
    description:
      "Look up a developer term in the AllTools glossary (e.g. 'ORM', 'ACID', 'SSR') and get a plain-English definition.",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "Term to define, e.g. 'ORM'" } },
      required: ["term"],
    },
  },
];

function textContent(text: string) {
  return { content: [{ type: "text", text }], isError: false as const };
}

function callTool(name: string, args: Record<string, unknown>) {
  const catalog = getCatalog();

  if (name === "search_tools") {
    const query = String(args.query ?? "").trim();
    if (!query) return textContent("Error: query is required.");
    const limit = Math.min(25, Math.max(1, Number(args.limit) || 8));
    const category = typeof args.category === "string" ? args.category.toLowerCase() : undefined;
    const pricing = typeof args.pricing === "string" ? args.pricing.toLowerCase() : undefined;
    const result = searchTools({
      q: query.slice(0, 200),
      filters: { category, pricing },
      page: 1,
      perPage: limit,
      facets: false,
    });
    if (result.items.length === 0) return textContent(`No tools found for "${query}".`);
    const lines = result.items.map(
      (t, i) =>
        `${i + 1}. **${t.name}** (${t.pricing}${t.openSource ? ", open source" : ""}) — ${t.description}\n   URL: ${t.url} · Details: /tools/${t.slug} · Category: ${t.categoryName}${t.installCommand ? `\n   Install: ${t.installCommand}` : ""}`,
    );
    return textContent(
      `Found ${result.total} tool(s) for "${query}" — showing ${result.items.length}:\n\n${lines.join("\n\n")}`,
    );
  }

  if (name === "get_tool") {
    const slug = String(args.slug ?? "").slice(0, 120);
    const t = getToolBySlug(slug);
    if (!t || t.status === "deprecated") return textContent(`Tool "${slug}" not found.`);
    const parts = [
      `# ${t.name}`,
      `${t.description}`,
      `- URL: ${t.url}`,
      `- Category: ${t.categoryName}${t.subcategoryName ? ` / ${t.subcategoryName}` : ""}`,
      `- Pricing: ${t.pricing}${t.openSource ? " · Open source" : ""}${t.selfHosted ? " · Self-hostable" : ""}`,
      t.installCommand ? `- Install: ${t.installCommand}` : "",
      t.documentationUrl ? `- Docs: ${t.documentationUrl}` : "",
      t.githubStars !== null ? `- GitHub stars: ${t.githubStars}` : "",
      `- Link verified: ${t.verified ? formatDateSafe(t.lastVerifiedAt) : "pending"}`,
      t.pros.length ? `\nStrengths:\n${t.pros.map((p) => `+ ${p}`).join("\n")}` : "",
      t.cons.length ? `\nTrade-offs:\n${t.cons.map((c) => `- ${c}`).join("\n")}` : "",
      t.alternatives.length ? `\nAlternatives: ${t.alternatives.join(", ")}` : "",
      t.useCases.length ? `\nUseful for: ${t.useCases.join("; ")}` : "",
    ].filter(Boolean);
    return textContent(parts.join("\n"));
  }

  if (name === "list_categories") {
    const lines = catalog.categories
      .filter((c) => c.toolCount > 0)
      .map((c) => `- ${c.name} (${c.slug}): ${c.toolCount} tools`);
    return textContent(`AllTools catalog — ${catalog.total} tools in ${catalog.categories.length} categories:\n\n${lines.join("\n")}`);
  }

  if (name === "lookup_term") {
    const raw = String(args.term ?? "").trim().toLowerCase();
    const term =
      GLOSSARY.find((g) => g.slug === raw.replace(/\s+/g, "-")) ??
      GLOSSARY.find((g) => g.term.toLowerCase() === raw);
    if (!term) return textContent(`No glossary entry for "${args.term}".`);
    const parts = [
      `**${term.term}** — ${term.short}`,
      "",
      term.definition,
      term.example ? `\nExample: ${term.example}` : "",
      term.relatedTools?.length ? `\nRelated tools: ${term.relatedTools.join(", ")}` : "",
      term.relatedTerms?.length ? `\nRelated terms: ${term.relatedTerms.join(", ")}` : "",
    ].filter(Boolean);
    return textContent(parts.join("\n"));
  }

  return textContent(`Unknown tool: ${name}`);
}

function formatDateSafe(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "unknown";
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`mcp:${clientIp(req)}`, 120, 60_000).ok) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "rate limited" } },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let body: {
    jsonrpc?: string;
    id?: unknown;
    method?: string;
    params?: { protocolVersion?: string; _meta?: unknown; name?: string; arguments?: Record<string, unknown> };
  };
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id = null, method } = body;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: body.params?.protocolVersion ?? PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOL_DEFS });
    case "tools/call": {
      const name = String(body.params?.name ?? "");
      try {
        return rpcResult(id, callTool(name, body.params?.arguments ?? {}));
      } catch (err) {
        return rpcResult(
          id,
          { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : "internal"}` }], isError: true },
        );
      }
    }
    default:
      if (typeof method === "string" && method.startsWith("notifications/")) {
        return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
      }
      return rpcError(id, -32601, `Method not found: ${String(method)}`);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      error: "method not allowed",
      hint: "POST JSON-RPC 2.0 messages here. See https://modelcontextprotocol.io for the client protocol.",
    },
    { status: 405, headers: CORS_HEADERS },
  );
}
