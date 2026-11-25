"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Copy, Download, GitPullRequest, History, Link2, Loader2, ScanSearch, Sparkles, Upload } from "lucide-react";

interface Finding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  line?: number;
  suggestion?: string;
}

interface Result {
  engine: "llm" | "heuristic";
  summary: string;
  score: number;
  findings: Finding[];
}

interface HistoryEntry {
  id: string;
  language: string;
  score: number;
  summary: string;
  findingsCount: number;
  createdAt: number;
  codePreview: string;
  code: string;
  result: Result;
}

const HISTORY_KEY = "aktifkoding-ai-review-history";
const HISTORY_EVENT = "aktifkoding-ai-review-history-change";
const EMPTY_HISTORY: HistoryEntry[] = [];
let cachedRaw: string | null = null;
let cachedParsed: HistoryEntry[] = EMPTY_HISTORY;

function readHistorySnapshot(): HistoryEntry[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === cachedRaw) return cachedParsed;
    cachedRaw = raw;
    if (!raw) {
      cachedParsed = EMPTY_HISTORY;
      return cachedParsed;
    }
    const parsed = JSON.parse(raw) as HistoryEntry[];
    cachedParsed = Array.isArray(parsed) ? parsed.slice(0, 8) : EMPTY_HISTORY;
    return cachedParsed;
  } catch {
    return EMPTY_HISTORY;
  }
}

function subscribeHistory(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(HISTORY_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(HISTORY_EVENT, cb);
  };
}

const SAMPLES: { label: string; language: string; code: string }[] = [
  {
    label: "Express API (SQLi + Secret)",
    language: "typescript",
    code: `import express from "express";
import { readFileSync } from "node:fs";

const API_KEY = "sk-live-1234567890abcdef123456";
const app = express();

app.get("/users", async (req, res) => {
  try {
    const id = req.query.id;
    const rows = await db.query(\`SELECT * FROM users WHERE id = \${id}\`);
    const cfg = JSON.parse(readFileSync("./config.json", "utf8"));
    console.log("fetched", rows.length, cfg);
    res.json(rows);
  } catch (e) {}
});`,
  },
  {
    label: "React XSS + localStorage",
    language: "typescript",
    code: `export function ProfileCard({ bio, token }: { bio: string; token: string }) {
  localStorage.setItem("auth_token", token);
  function renderHtml(el: HTMLElement) {
    el.innerHTML = bio;
  }
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}`,
  },
  {
    label: "Git Diff (PR)",
    language: "typescript",
    code: `@@ -12,6 +12,11 @@ export async function handler(req: Request) {
   const user = await getUser(req);
+  const query = new URL(req.url).searchParams.get("q") ?? "";
+  const rows = await db.execute(\`SELECT * FROM items WHERE name = '\${query}'\`);
+  console.log("debug user token:", req.headers.get("authorization"));
+  return Response.json(rows);
 }`,
  },
];

const SEVERITY_STYLE: Record<Finding["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "border-border bg-muted text-muted-foreground",
};

function guessLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    php: "php",
    java: "java",
    sql: "sql",
  };
  return map[ext] ?? "other";
}

export function AiReviewClient() {
  const [code, setCode] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mode, setMode] = useState<"code" | "diff">("code");
  const [language, setLanguage] = useState("typescript");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedPr, setCopiedPr] = useState(false);
  const history = useSyncExternalStore(subscribeHistory, readHistorySnapshot, () => EMPTY_HISTORY);
  const fileRef = useRef<HTMLInputElement>(null);

  function saveHistory(entry: HistoryEntry) {
    const next = [entry, ...readHistorySnapshot()].slice(0, 8);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(HISTORY_EVENT));
    } catch {
      // ignore quota
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCode(text.slice(0, 20_000));
    setLanguage(guessLanguage(file.name));
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sourceUrl.trim() && !code.trim() ? "" : code,
          sourceUrl: sourceUrl.trim() || undefined,
          mode,
          language,
          focus,
        }),
      });
      if (res.status === 402) {
        const data = (await res.json()) as { hint?: string; limit?: number };
        setError({
          message:
            data.hint === "login"
              ? "Kuota anonim habis. Login untuk 5 review/hari, atau upgrade Pro."
              : "Kuota harian habis. Upgrade ke Pro untuk review hampir tanpa batas.",
          hint: data.hint,
        });
        return;
      }
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setError({
          message:
            errBody.error === "invalid-source-url"
              ? "URL harus berasal dari GitHub file (blob/raw) atau GitHub Gist publik."
              : errBody.error === "source-fetch-failed"
                ? "Gagal mengambil kode dari URL GitHub/Gist tersebut. Pastikan repositori/gist publik."
                : "Gagal mereview. Coba lagi.",
        });
        return;
      }
      const data = (await res.json()) as Result & {
        fetchedCode?: string;
        quota?: { used: number; limit: number | null };
      };
      const effectiveCode = data.fetchedCode ?? code;
      if (data.fetchedCode) setCode(data.fetchedCode);
      setResult(data);
      if (data.quota?.limit != null) {
        setQuotaInfo(`${data.quota.used}/${data.quota.limit} review hari ini`);
      }
      saveHistory({
        id: String(Date.now()),
        language,
        score: data.score,
        summary: data.summary,
        findingsCount: data.findings.length,
        createdAt: Date.now(),
        codePreview: effectiveCode.trim().split("\n")[0]?.slice(0, 60) || language,
        code: effectiveCode,
        result: data,
      });
    } catch {
      setError({ message: "Gagal terhubung. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  function buildMarkdownReport(): string {
    if (!result) return "";
    return [
      `## AI Code Review Report (${language}${mode === "diff" ? " · Git Diff" : ""})`,
      "",
      `- **Score**: ${result.score}/100`,
      `- **Engine**: ${result.engine}`,
      `- **Summary**: ${result.summary}`,
      "",
      "### Findings",
      "",
      ...(result.findings.length === 0
        ? ["✅ Tidak ada temuan kritis atau peringatan."]
        : result.findings.map((f, idx) =>
            [
              `#### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}${f.line ? ` (Line ${f.line})` : ""}`,
              f.detail,
              f.suggestion ? `\n\`\`\`${language}\n${f.suggestion}\n\`\`\`` : "",
              "",
            ].join("\n"),
          )),
      "---",
      "_Generated with [AktifKoding AI Code Review](https://aktifkoding.biz.id/ai-review)_",
    ].join("\n");
  }

  function exportMarkdown() {
    if (!result) return;
    const lines = buildMarkdownReport();
    const blob = new Blob([lines], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aktifkoding-review-${language}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyPrComment() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownReport());
      setCopiedPr(true);
      setTimeout(() => setCopiedPr(false), 1800);
    } catch {
      // ignore
    }
  }

  async function copySuggestion(idx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // ignore
    }
  }

  const lineCount = code ? code.split("\n").length : 0;

  return (
    <div className="space-y-6">
      {/* Quick samples + file upload */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Coba contoh:
        </span>
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              setCode(s.code);
              setLanguage(s.language);
              setMode(s.label.includes("Diff") ? "diff" : "code");
              setSourceUrl("");
              setResult(null);
              setError(null);
            }}
            className="chip"
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="chip ml-auto gap-1"
        >
          <Upload className="h-3 w-3" />
          Upload file kode
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".ts,.tsx,.js,.jsx,.py,.go,.php,.java,.sql,.txt"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="card space-y-3 p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("code")}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  mode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Kode
              </button>
              <button
                type="button"
                onClick={() => setMode("diff")}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                  mode === "diff" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <GitPullRequest className="h-3 w-3" />
                Git Diff
              </button>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              aria-label="Bahasa"
            >
              {["typescript", "javascript", "python", "go", "php", "java", "sql", "other"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Fokus (opsional): keamanan, performa, SQL…"
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Atau tempel URL GitHub file / Gist publik (opsional)…"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-accent"
            />
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={17}
            placeholder={
              mode === "diff"
                ? "Tempel output `git diff` di sini… (min. 20, maks. 20.000 karakter)"
                : "Tempel kode di sini atau seret file ke area ini… (min. 20, maks. 20.000 karakter)"
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {quotaInfo ?? "Gratis 3×/hari tanpa login · 5× dengan login"} · {lineCount} baris ({code.length.toLocaleString()}/20.000)
            </span>
            <button
              type="button"
              onClick={run}
              disabled={busy || (code.trim().length < 20 && !sourceUrl.trim())}
              className="btn-primary disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              Review kode
            </button>
          </div>
        </div>

        <div className="card h-fit p-5">
          {error && (
            <div className="text-sm">
              <p className="text-red-600 dark:text-red-400">{error.message}</p>
              <div className="mt-3 flex gap-2">
                {error.hint === "login" && (
                  <Link href="/login?next=/ai-review" className="btn-secondary">
                    Login
                  </Link>
                )}
                <Link href="/pricing" className="btn-primary">
                  Upgrade Pro
                </Link>
              </div>
            </div>
          )}
          {!error && !result && (
            <div className="space-y-2 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Siap menganalisis kode Anda</p>
              <p>
                Hasil review muncul di sini: skor kesehatan (0–100), temuan berdasarkan
                tingkat keparahan beserta nomor baris, dan cuplikan saran perbaikan yang
                bisa langsung disalin.
              </p>
            </div>
          )}
          {result && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {result.engine === "llm" ? "Mesin: LLM" : "Mesin: heuristik (lokal)"}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyPrComment()}
                    className="btn-secondary !px-2.5 !py-1 text-xs"
                  >
                    {copiedPr ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedPr ? "Disalin!" : "Salin PR Comment"}
                  </button>
                  <button
                    type="button"
                    onClick={exportMarkdown}
                    className="btn-secondary !px-2.5 !py-1 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export .md
                  </button>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      result.score >= 80
                        ? "bg-success/15 text-success"
                        : result.score >= 50
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-red-500/15 text-red-700 dark:text-red-400"
                    }`}
                  >
                    Skor {result.score}/100
                  </span>
                </div>
              </div>
              <p className="mt-2.5 text-sm">{result.summary}</p>
              <ul className="mt-4 space-y-3">
                {result.findings.map((f, i) => (
                  <li key={i} className={`rounded-lg border p-3.5 ${SEVERITY_STYLE[f.severity]}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {f.severity === "critical" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵"} {f.title}
                      </p>
                      {f.line && (
                        <span className="shrink-0 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px]">
                          Baris {f.line}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{f.detail}</p>
                    {f.suggestion && (
                      <div className="mt-2.5 overflow-hidden rounded-md border border-border/60 bg-background/80">
                        <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                          <span>Saran perbaikan</span>
                          <button
                            type="button"
                            onClick={() => void copySuggestion(i, f.suggestion!)}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            {copiedIdx === i ? (
                              <>
                                <Check className="h-3 w-3 text-success" /> Disalin
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Salin
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="overflow-x-auto p-2.5 font-mono text-[11px] text-foreground">
                          <code>{f.suggestion}</code>
                        </pre>
                      </div>
                    )}
                  </li>
                ))}
                {result.findings.length === 0 && (
                  <li className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
                    Bersih — tidak ada temuan.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-accent" />
              Riwayat review lokal (tersimpan di browser ini)
            </h2>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(HISTORY_KEY);
                window.dispatchEvent(new Event(HISTORY_EVENT));
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Bersihkan
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setCode(h.code);
                  setLanguage(h.language);
                  setResult(h.result);
                  setError(null);
                }}
                className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-accent/50"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium uppercase text-accent">{h.language}</span>
                  <span className="font-semibold">{h.score}/100</span>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{h.codePreview}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {h.findingsCount} temuan · {new Date(h.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
