"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  generateBoilerplate,
  slugifyProjectName,
  type AuthMode,
  type Database,
  type Stack,
} from "@/lib/generators/boilerplate";
import { downloadZip } from "@/lib/zip";

type Option<T extends string> = { value: T; label: string; hint?: string };

const STACKS: Option<Stack>[] = [
  { value: "next", label: "Next.js (App Router)" },
  { value: "vite", label: "Vite + React SPA" },
  { value: "express", label: "Express + TypeScript" },
  { value: "hono", label: "Hono (Edge/Workers)" },
  { value: "fastapi", label: "FastAPI (Python)" },
];

const DATABASES: Option<Database>[] = [
  { value: "none", label: "Tanpa database" },
  { value: "postgres", label: "PostgreSQL (Drizzle)" },
  { value: "sqlite", label: "SQLite" },
  { value: "mysql", label: "MySQL" },
];

const AUTH: Option<AuthMode>[] = [
  { value: "none", label: "Tanpa auth" },
  { value: "session", label: "Session cookie" },
  { value: "jwt", label: "JWT" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function BoilerplateGenerator() {
  const [name, setName] = useState("my-app");
  const [stack, setStack] = useState<Stack>("next");
  const [database, setDatabase] = useState<Database>("postgres");
  const [auth, setAuth] = useState<AuthMode>("session");
  const [docker, setDocker] = useState(true);
  const [tests, setTests] = useState(true);
  const [busy, setBusy] = useState(false);

  const slug = useMemo(() => slugifyProjectName(name), [name]);
  const files = useMemo(
    () => generateBoilerplate({ projectName: slug, stack, database, auth, docker, tests }),
    [slug, stack, database, auth, docker, tests],
  );
  const fileList = Object.keys(files).sort();

  async function download() {
    setBusy(true);
    try {
      await downloadZip(files, `${slug}.zip`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="card h-fit space-y-5 p-6">
        <div>
          <label htmlFor="projname" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nama proyek
          </label>
          <input
            id="projname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="my-app"
          />
        </div>
        <Section title="Stack">
          {STACKS.map((s) => (
            <Chip key={s.value} active={stack === s.value} onClick={() => setStack(s.value)}>
              {s.label}
            </Chip>
          ))}
        </Section>
        <Section title="Database">
          {DATABASES.map((d) => (
            <Chip key={d.value} active={database === d.value} onClick={() => setDatabase(d.value)}>
              {d.label}
            </Chip>
          ))}
        </Section>
        <Section title="Auth">
          {AUTH.map((a) => (
            <Chip key={a.value} active={auth === a.value} onClick={() => setAuth(a.value)}>
              {a.label}
            </Chip>
          ))}
        </Section>
        <Section title="Opsional">
          <Chip active={docker} onClick={() => setDocker(!docker)}>
            Docker {docker ? "✓" : ""}
          </Chip>
          <Chip active={tests} onClick={() => setTests(!tests)}>
            Tests {tests ? "✓" : ""}
          </Chip>
        </Section>
        <button type="button" onClick={download} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Unduh {slug}.zip
        </button>
        <p className="text-xs text-muted-foreground">
          {fileList.length} file dihasilkan lokal di browser Anda.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-accent" />
          Struktur file
        </h2>
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {fileList.map((f) => (
            <li key={f} className="rounded-md bg-muted px-3 py-1.5 font-mono text-xs">
              {f}
            </li>
          ))}
        </ul>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold marker:text-accent">
            Pratinjau isi file
          </summary>
          <div className="mt-3 max-h-96 space-y-4 overflow-y-auto">
            {fileList.slice(0, 6).map((f) => (
              <details key={f}>
                <summary className="cursor-pointer font-mono text-xs marker:text-accent">{f}</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                  {files[f]}
                </pre>
              </details>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
