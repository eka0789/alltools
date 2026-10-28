"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ScanSearch } from "lucide-react";

interface Finding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

interface Result {
  engine: "llm" | "heuristic";
  summary: string;
  score: number;
  findings: Finding[];
}

const SEVERITY_STYLE: Record<Finding["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "border-border bg-muted text-muted-foreground",
};

export function AiReviewClient() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, focus }),
      });
      if (res.status === 402) {
        const data = (await res.json()) as { hint?: string; limit?: number };
        setError({
          message: data.hint === "login" ? "Kuota anonim habis. Login untuk 5 review/hari, atau upgrade Pro." : "Kuota harian habis. Upgrade ke Pro untuk tanpa batas.",
          hint: data.hint,
        });
        return;
      }
      if (!res.ok) {
        setError({ message: "Gagal mereview. Coba lagi." });
        return;
      }
      const data = (await res.json()) as Result & { quota?: { used: number; limit: number | null } };
      setResult(data);
      if (data.quota?.limit != null) {
        setQuotaInfo(`${data.quota.used}/${data.quota.limit} review hari ini`);
      }
    } catch {
      setError({ message: "Gagal terhubung. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <div className="flex gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            aria-label="Bahasa"
          >
            {["typescript", "javascript", "python", "go", "php", "java", "sql", "other"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Fokus (opsional): keamanan, performa…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={18}
          placeholder="Tempel kode di sini… (maks. 20.000 karakter)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{quotaInfo ?? "Gratis 3×/hari tanpa login"}</span>
          <button
            type="button"
            onClick={run}
            disabled={busy || code.trim().length < 20}
            className="btn-primary"
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
          <p className="text-sm text-muted-foreground">
            Hasil review muncul di sini: skor kesehatan, temuan berdasarkan
            tingkat keparahan, dan saran perbaikan konkret.
          </p>
        )}
        {result && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {result.engine === "llm" ? "Mesin: LLM" : "Mesin: heuristik (lokal)"}
              </span>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">
                Skor {result.score}/100
              </span>
            </div>
            <p className="mt-2 text-sm">{result.summary}</p>
            <ul className="mt-4 space-y-3">
              {result.findings.map((f, i) => (
                <li key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLE[f.severity]}`}>
                  <p className="text-sm font-semibold">
                    {f.severity === "critical" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵"} {f.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{f.detail}</p>
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
  );
}
