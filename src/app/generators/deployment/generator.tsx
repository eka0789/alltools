"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  generateDeployConfig,
  type Ci,
  type Database,
  type DeployStack,
  type DeployTarget,
} from "@/lib/generators/deploy";
import { downloadZip } from "@/lib/zip";
import { CopyButton } from "@/components/copy-button";

const STACKS: { value: DeployStack; label: string }[] = [
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python (FastAPI)" },
  { value: "static", label: "Static site" },
];

const TARGETS: { value: DeployTarget; label: string; hint: string }[] = [
  { value: "vercel", label: "Vercel", hint: "Paling mulus untuk Next.js" },
  { value: "vps-docker", label: "VPS + Docker", hint: "Kontrol penuh, biaya tetap" },
  { value: "vps-pm2", label: "VPS + PM2", hint: "Tanpa Docker" },
];

const DATABASES: { value: Database; label: string }[] = [
  { value: "none", label: "Tanpa database" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "redis", label: "Redis" },
];

const CIS: { value: Ci; label: string }[] = [
  { value: "none", label: "Tanpa CI" },
  { value: "github-actions", label: "GitHub Actions" },
];

export function DeploymentGenerator() {
  const [projectName, setProjectName] = useState("my-app");
  const [stack, setStack] = useState<DeployStack>("node");
  const [target, setTarget] = useState<DeployTarget>("vps-docker");
  const [database, setDatabase] = useState<Database>("postgres");
  const [ci, setCi] = useState<Ci>("github-actions");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  const files = useMemo(
    () => generateDeployConfig({ projectName, stack, target, database, ci, domain }),
    [projectName, stack, target, database, ci, domain],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const current = files.find((f) => f.path === selected) ?? files[0];

  async function downloadAll() {
    setBusy(true);
    try {
      const map: Record<string, string> = {};
      for (const f of files) map[f.path] = f.content;
      await downloadZip(map, "deploy-config.zip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="card h-fit space-y-5 p-6">
        <div>
          <label htmlFor="deployname" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nama proyek
          </label>
          <input
            id="deployname"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stack</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {STACKS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStack(s.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  stack === s.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</h3>
          <div className="mt-2 space-y-2">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTarget(t.value)}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  target === t.value
                    ? "border-accent bg-accent-soft"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs opacity-70">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Database</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {DATABASES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDatabase(d.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  database === d.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CI/CD</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {CIS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCi(c.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  ci === c.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="domain" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Domain (opsional)
          </label>
          <input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="app.domainanda.com"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button type="button" onClick={downloadAll} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Unduh semua (ZIP)
        </button>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setSelected(f.path)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                current.path === f.path ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-xs text-muted-foreground">{current.path}</p>
          <CopyButton text={current.content} />
        </div>
        <pre className="mt-2 max-h-[480px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
          {current.content}
        </pre>
      </div>
    </div>
  );
}
