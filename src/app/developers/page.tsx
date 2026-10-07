import type { Metadata } from "next";
import Link from "next/link";
import { Braces, Bot, Rss } from "lucide-react";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Public API & MCP Server",
  description:
    "Use the AllTools catalog as data: a free JSON API for 800+ curated developer tools, an MCP server for AI assistants, and RSS.",
  alternates: { canonical: "/developers" },
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/tools",
    desc: "Paginated catalog. Params: page, perPage (≤100), category, tag, pricing, q, sort (name | newest | popular).",
    example: `curl "https://alldevtools.vercel.app/api/v1/tools?category=database&pricing=free&perPage=5"`,
  },
  {
    method: "GET",
    path: "/api/v1/tools/[slug]",
    desc: "One tool with the full public projection: pros/cons, install command, GitHub stats, alternatives.",
    example: `curl "https://alldevtools.vercel.app/api/v1/tools/next-js"`,
  },
  {
    method: "GET",
    path: "/api/v1/search",
    desc: "Search with fuzzy matching, synonyms and task-based intents. Params: q (required), limit (≤25), category, tag, pricing.",
    example: `curl "https://alldevtools.vercel.app/api/v1/search?q=test%20rest%20api&limit=5"`,
  },
  {
    method: "GET",
    path: "/api/v1/categories",
    desc: "The taxonomy with live tool counts and subcategories.",
    example: `curl "https://alldevtools.vercel.app/api/v1/categories"`,
  },
];

export default function DevelopersPage() {
  const origin = "https://alldevtools.vercel.app";
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Braces className="h-6 w-6 text-accent" />
          Public API &amp; MCP
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The whole catalog is data, not just pages. Use it in your blog, bots,
          research or IDE — free, no key required, CORS enabled. Attribution
          appreciated but not enforced.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">JSON API (v1)</h2>
        <div className="mt-4 space-y-4">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent">
                  {e.method}
                </span>
                <code className="font-mono text-sm">{e.path}</code>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{e.desc}</p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs">
                <code>{e.example}</code>
              </pre>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Responses are cached at the edge (up to 10 min). Fair use: 60 requests
          per minute per IP. Data is editorially curated — don&apos;t present it as
          official vendor information.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bot className="h-5 w-5 text-accent" />
          MCP server — use AllTools inside your AI assistant
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          AllTools speaks the Model Context Protocol. Add it once and Claude
          Desktop, Cursor, Cline or any MCP client can search the catalog and
          define terms without leaving your editor.
        </p>
        <div className="card mt-4 p-5">
          <p className="text-sm font-semibold">Endpoint</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs">
            <code>{`${origin}/api/mcp`}</code>
          </pre>
          <p className="mt-4 text-sm font-semibold">Claude Desktop / Cursor config</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs">
            <code>{JSON.stringify(
              {
                mcpServers: {
                  alltools: { url: `${origin}/api/mcp` },
                },
              },
              null,
              2,
            )}</code>
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Tools exposed: <code className="font-mono">search_tools</code>,{" "}
            <code className="font-mono">get_tool</code>,{" "}
            <code className="font-mono">list_categories</code>,{" "}
            <code className="font-mono">lookup_term</code>.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Rss className="h-5 w-5 text-accent" />
          RSS &amp; more
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow new additions via{" "}
          <Link href="/feed.xml" className="text-accent hover:underline">/feed.xml</Link>,
          or subscribe to the{" "}
          <Link href="/whats-new" className="text-accent hover:underline">weekly digest</Link>.
        </p>
      </section>
    </div>
  );
}
