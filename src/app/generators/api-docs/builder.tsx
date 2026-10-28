"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import {
  EMPTY_ENDPOINT,
  generateApiMarkdown,
  generateOpenApi,
  type ApiEndpointInput,
} from "@/lib/generators/api-docs";
import { CopyButton } from "@/components/copy-button";
import { downloadZip } from "@/lib/zip";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function ApiDocsBuilder() {
  const [title, setTitle] = useState("My API");
  const [serverUrl, setServerUrl] = useState("https://api.example.com");
  const [bearer, setBearer] = useState(true);
  const [endpoints, setEndpoints] = useState<ApiEndpointInput[]>([{ ...EMPTY_ENDPOINT }]);
  const [busy, setBusy] = useState(false);

  const markdown = useMemo(
    () => generateApiMarkdown(endpoints, { title, serverUrl, bearer }),
    [endpoints, title, serverUrl, bearer],
  );
  const openapi = useMemo(
    () => generateOpenApi(endpoints, { title, version: "1.0.0", serverUrl, bearer }),
    [endpoints, title, serverUrl, bearer],
  );
  const [tab, setTab] = useState<"markdown" | "openapi">("markdown");

  function update(index: number, patch: Partial<ApiEndpointInput>) {
    setEndpoints((eps) => eps.map((ep, i) => (i === index ? { ...ep, ...patch } : ep)));
  }

  async function download() {
    setBusy(true);
    try {
      await downloadZip(
        { "API.md": markdown, "openapi.yaml": openapi },
        "api-docs.zip",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Editor */}
      <div className="space-y-4">
        <div className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Judul API</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Base URL</label>
              <input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bearer} onChange={(e) => setBearer(e.target.checked)} />
            Endpoint memakai Bearer token
          </label>
        </div>

        {endpoints.map((ep, i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="flex items-center gap-2">
              <select
                value={ep.method}
                onChange={(e) => update(i, { method: e.target.value })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                value={ep.path}
                onChange={(e) => update(i, { path: e.target.value })}
                placeholder="/users/{id}"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm outline-none focus:border-accent"
              />
              {endpoints.length > 1 && (
                <button
                  type="button"
                  onClick={() => setEndpoints((eps) => eps.filter((_, j) => j !== i))}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-red-600"
                  aria-label="Hapus endpoint"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              value={ep.summary}
              onChange={(e) => update(i, { summary: e.target.value })}
              placeholder="Ringkasan singkat"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ep.auth} onChange={(e) => update(i, { auth: e.target.checked })} />
              Butuh auth
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Request body (JSON)</label>
                <textarea
                  value={ep.requestBodyJson}
                  onChange={(e) => update(i, { requestBodyJson: e.target.value })}
                  rows={5}
                  placeholder='{ "name": "Budi" }'
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Response (JSON)</label>
                <textarea
                  value={ep.responseJson}
                  onChange={(e) => update(i, { responseJson: e.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Path params (format: id:integer, slug:string)
              </label>
              <input
                value={ep.pathParams.map((p) => `${p.name}:${p.type}`).join(", ")}
                onChange={(e) =>
                  update(i, {
                    pathParams: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((pair) => {
                        const [n, t] = pair.split(":");
                        return { name: n.trim(), type: (t ?? "string").trim(), required: true };
                      }),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Query params (format: page:integer:halaman ke-n)
              </label>
              <input
                value={ep.queryParams.map((p) => `${p.name}:${p.type}:${p.description}`).join(", ")}
                onChange={(e) =>
                  update(i, {
                    queryParams: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((pair) => {
                        const [n, t, ...rest] = pair.split(":");
                        return {
                          name: n.trim(),
                          type: (t ?? "string").trim(),
                          required: false,
                          description: rest.join(":").trim(),
                        };
                      }),
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-accent"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setEndpoints((eps) => [...eps, { ...EMPTY_ENDPOINT, path: "", summary: "" }])}
          className="btn-secondary w-full"
        >
          <Plus className="h-4 w-4" />
          Tambah endpoint
        </button>
      </div>

      {/* Output */}
      <div className="card h-fit p-5 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("markdown")}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === "markdown" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setTab("openapi")}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === "openapi" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              OpenAPI 3.1
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={tab === "markdown" ? markdown : openapi} />
            <button type="button" onClick={download} className="btn-secondary">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              ZIP
            </button>
          </div>
        </div>
        <pre className="mt-3 max-h-[560px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
          {tab === "markdown" ? markdown : openapi}
        </pre>
      </div>
    </div>
  );
}
