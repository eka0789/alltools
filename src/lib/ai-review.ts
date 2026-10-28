// AI code review: dua mesin — heuristik deterministik (selalu tersedia) dan
// LLM opsional (kunci API terkonfigurasi). LLM diminta mengeluarkan JSON;
// gagal parse → fallback heuristik. Review TIDAK mengubah kode pengguna.

export type Severity = "critical" | "warning" | "info";

export interface ReviewFinding {
  severity: Severity;
  title: string;
  detail: string;
}

export interface ReviewResult {
  engine: "llm" | "heuristic";
  summary: string;
  score: number; // 0-100, makin tinggi makin sehat
  findings: ReviewFinding[];
}

interface Rule {
  pattern: RegExp;
  severity: Severity;
  title: string;
  detail: string;
}

const RULES: Rule[] = [
  {
    pattern: /\beval\s*\(/,
    severity: "critical",
    title: "eval() terdeteksi",
    detail: "eval mengeksekusi string apa pun sebagai kode — pintu injeksi. Pakai JSON.parse, parser, atau mapping eksplisit.",
  },
  {
    pattern: /new\s+Function\s*\(/,
    severity: "critical",
    title: "new Function() terdeteksi",
    detail: "Sama berbahayanya dengan eval — kode dinamis dari string tidak bisa diaudit.",
  },
  {
    pattern: /\.innerHTML\s*=/,
    severity: "critical",
    title: "Penugasan innerHTML",
    detail: "Rentan XSS bila sumber string menyentuh input pengguna. Gunakan textContent atau sanitasi (DOMPurify).",
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    severity: "warning",
    title: "dangerouslySetInnerHTML digunakan",
    detail: "Di React ini XSS by design. Pastikan kontennya sanitasi dan benar-benar perlu HTML kaya.",
  },
  {
    pattern: /child_process|exec\s*\(/,
    severity: "critical",
    title: "Eksekusi shell",
    detail: "exec/execSync dengan interpolasi string = command injection. Pakai execFile dengan array argumen.",
  },
  {
    pattern: /(SELECT|INSERT|UPDATE|DELETE)\s+.*\$\{|\+\s*req\.|\+\s*request\.|query\s*\+\s*/,
    severity: "critical",
    title: "Kemungkinan SQL injection",
    detail: "Query SQL dibangun dari konkatenasi/interpolasi. Gunakan parameterized query ($1, ?, :param).",
  },
  {
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    severity: "critical",
    title: "Kredensial tertulis di kode",
    detail: "Secret keras di source akan terbawa ke git history. Pindahkan ke environment variable.",
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "warning",
    title: "catch kosong",
    detail: "Error ditelan diam-diam; kegagalan produksi tidak terlihat. Minimal log/errorlah atau lempar ulang.",
  },
  {
    pattern: /\bvar\s+\w+/,
    severity: "info",
    title: "Pemakaian var",
    detail: "var punya hoisting & scope fungsi yang jebakan. Gunakan const/let.",
  },
  {
    pattern: /[^=!<>]==[^=]/,
    severity: "info",
    title: "Perbandingan longgar ==",
    detail: "== melakukan koersi aneh ('0' == false). Gunakan === / !==.",
  },
  {
    pattern: /console\.log\(/,
    severity: "info",
    title: "console.log tertinggal",
    detail: "Pakai logger terstruktur (pino/winston) agar level & konteks bisa diatur; console.log bocor ke stdout produksi.",
  },
  {
    pattern: /JSON\.parse\(/,
    severity: "info",
    title: "JSON.parse tanpa try/catch terlihat",
    detail: "Input tidak selalu JSON valid. Bungkus JSON.parse dengan try/catch atau validasi dengan zod.",
  },
  {
    pattern: /readFileSync|writeFileSync/,
    severity: "warning",
    title: "I/O sinkron filesystem",
    detail: "readFileSync memblokir event loop Node — latency semua request naik. Gunakan fs/promise.",
  },
  {
    pattern: /TODO|FIXME|HACK/,
    severity: "info",
    title: "Tanda tugas tertunda",
    detail: "TODO/FIXME di kode produksi mudah terlupakan — jadikan issue terlacak.",
  },
  {
    pattern: /localStorage\.setItem\([^,]*token|sessionStorage\..*token/i,
    severity: "warning",
    title: "Token disimpan di web storage",
    detail: "localStorage rentan dibaca script pihak ketiga (XSS). Untuk sesi, prefer cookie httpOnly.",
  },
];

export function heuristicReview(code: string, language: string): ReviewResult {
  const findings: ReviewFinding[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(code)) {
      findings.push({ severity: rule.severity, title: rule.title, detail: rule.detail });
    }
  }
  const lines = code.split("\n").length;
  if (lines > 400) {
    findings.push({
      severity: "info",
      title: "File panjang",
      detail: `${lines} baris dalam satu berkas menandakan tanggung jawab ganda. Pertimbangkan pemecahan modul.`,
    });
  }
  const weight: Record<Severity, number> = { critical: 18, warning: 8, info: 3 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(10, 100 - penalty);
  const summary =
    findings.length === 0
      ? "Tidak ada pola berisiko yang dikenali heuristik pada cuplikan ini."
      : `${findings.length} temuan (${findings.filter((f) => f.severity === "critical").length} kritis, ${findings.filter((f) => f.severity === "warning").length} peringatan) untuk ${language || "kode"}.`;
  return { engine: "heuristic", summary, score, findings };
}

// ── LLM (opsional) ────────────────────────────────────────────────────────
const API_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const BASE_URL = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

export function llmReviewEnabled(): boolean {
  return API_KEY !== "";
}

const MAX_CODE_CHARS = 20_000;

export async function llmReview(
  code: string,
  language: string,
  focus: string,
): Promise<ReviewResult | null> {
  if (!llmReviewEnabled()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: [
              "Kamu senior code reviewer. Review cuplikan kode pengguna dalam Bahasa Indonesia.",
              "Fokus: keamanan, bug logika, performa, dan kejelasan. Jangan mengarang baris kode yang tidak ada.",
              focus ? `Prioritas review: ${focus}.` : "",
              "Balas HANYA JSON valid dengan bentuk:",
              '{"summary": "string pendek", "score": 0-100, "findings": [{"severity": "critical|warning|info", "title": "...", "detail": "..."}]}',
              "Maksimal 8 findings, urut dari paling penting.",
            ]
              .filter(Boolean)
              .join(" "),
          },
          {
            role: "user",
            content: `Bahasa: ${language || "tidak diketahui"}\n\n\`\`\`\n${code.slice(0, MAX_CODE_CHARS)}\n\`\`\``,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const jsonText = raw.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      score?: number;
      findings?: { severity?: string; title?: string; detail?: string }[];
    };
    const severity = (s: string | undefined): Severity =>
      s === "critical" || s === "warning" || s === "info" ? s : "info";
    const findings: ReviewFinding[] = (parsed.findings ?? [])
      .filter((f) => f.title && f.detail)
      .slice(0, 8)
      .map((f) => ({
        severity: severity(f.severity),
        title: String(f.title).slice(0, 120),
        detail: String(f.detail).slice(0, 600),
      }));
    const score = Math.min(100, Math.max(0, Math.round(parsed.score ?? 70)));
    return {
      engine: "llm",
      summary: String(parsed.summary ?? "").slice(0, 400) || "Review selesai.",
      score,
      findings,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function reviewCode(
  code: string,
  language: string,
  focus: string,
): Promise<ReviewResult> {
  const llm = await llmReview(code, language, focus);
  if (llm) return llm;
  return heuristicReview(code, language);
}
