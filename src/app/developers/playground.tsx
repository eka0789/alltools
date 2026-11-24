"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";

const PRESETS = [
  { label: "Search API tools", path: "/api/v1/search?q=test+rest+api&limit=3" },
  { label: "Free database tools", path: "/api/v1/tools?category=database&pricing=free&perPage=3" },
  { label: "Next.js detail", path: "/api/v1/tools/next-js" },
  { label: "All categories", path: "/api/v1/categories" },
];

export function ApiPlayground() {
  const [path, setPath] = useState(PRESETS[0].path);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  async function run(target = path) {
    if (!target.startsWith("/api/v1/")) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(target);
      setStatus(res.status);
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2).slice(0, 6000));
    } catch {
      setOutput("Failed to reach endpoint.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Interactive API Playground</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPath(p.path);
                void run(p.path);
              }}
              className="chip"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="input flex-1 font-mono text-xs"
          aria-label="API endpoint path"
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !path.startsWith("/api/v1/")}
          className="btn-primary shrink-0 !py-1.5 text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Send GET
        </button>
      </div>
      {output !== null && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted/50">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono">{path}</span>
            {status !== null && (
              <span className={status < 400 ? "font-semibold text-success" : "font-semibold text-warning"}>
                HTTP {status}
              </span>
            )}
          </div>
          <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed">
            <code>{output}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
