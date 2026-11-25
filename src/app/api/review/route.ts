import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { reviewCode, llmReviewEnabled } from "@/lib/ai-review";
import { checkReviewQuota, recordUsage } from "@/lib/quota";
import { clientIp, rateLimitPersistent } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_CHARS = 20_000;
const ANON_COOKIE = "ak_anon";

// Converts a public GitHub blob / Gist URL into a safe raw URL.
// Strict allowlist prevents SSRF against internal or arbitrary hosts.
export function resolveSafeGithubRawUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname === "raw.githubusercontent.com" || u.hostname === "gist.githubusercontent.com") {
    return u.toString();
  }
  if (u.hostname === "github.com") {
    // https://github.com/owner/repo/blob/branch/path -> raw.githubusercontent.com
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 5 && parts[2] === "blob") {
      const [owner, repo, , branch, ...rest] = parts;
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rest.join("/")}`;
    }
    return null;
  }
  if (u.hostname === "gist.github.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
    }
  }
  return null;
}

// POST /api/review — { code?, sourceUrl?, mode?, language, focus }
// Kuota: anonim 3/hari (cookie), login gratis 5/hari, Pro 200/hari.
// Anonim tanpa kuota sisa → 402 dengan hint login/upgrade.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await rateLimitPersistent(`review:${ip}`, 30, 60_000)).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: {
    code?: string;
    sourceUrl?: string;
    mode?: "code" | "diff";
    language?: string;
    focus?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }

  let code = (body.code ?? "").slice(0, MAX_CHARS);

  if (!code.trim() && body.sourceUrl) {
    const rawUrl = resolveSafeGithubRawUrl(body.sourceUrl);
    if (!rawUrl) {
      return Response.json({ error: "invalid-source-url" }, { status: 400 });
    }
    try {
      const res = await fetch(rawUrl, {
        headers: { "User-Agent": "AktifKoding-CodeReview" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        return Response.json({ error: "source-fetch-failed" }, { status: 400 });
      }
      code = (await res.text()).slice(0, MAX_CHARS);
    } catch {
      return Response.json({ error: "source-fetch-failed" }, { status: 400 });
    }
  }

  if (code.trim().length < 20) {
    return Response.json({ error: "code-too-short" }, { status: 400 });
  }

  const user = await getSessionUser();

  // Cookie anon id (untuk kuota tanpa login).
  const existingAnon = req.cookies.get(ANON_COOKIE)?.value;
  const anonId = user ? null : existingAnon ?? randomBytes(16).toString("hex");

  // Anti-bypass: selain cookie, batasi juga anon per-IP per 24 jam agar
  // menghapus cookie tidak bisa dipakai spam LLM API tanpa batas.
  if (!user && !(await rateLimitPersistent(`review-anon-day:${ip}`, 6, 24 * 60 * 60_000)).ok) {
    return Response.json(
      { error: "quota-exceeded", tier: "anon", limit: 3, hint: "login" },
      { status: 402 },
    );
  }

  const quota = await checkReviewQuota({ userId: user?.id ?? null, anonId });
  if (!quota.allowed) {
    return Response.json(
      {
        error: "quota-exceeded",
        tier: quota.tier,
        limit: quota.limit,
        hint: user ? "upgrade" : "login",
      },
      { status: 402 },
    );
  }

  const modeHint =
    body.mode === "diff"
      ? "Input berupa Git diff — prioritaskan bug, regresi, dan celah keamanan pada baris baru (+)."
      : "";
  const combinedFocus = [modeHint, (body.focus ?? "").trim()]
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);

  const result = await reviewCode(code, (body.language ?? "").slice(0, 40), combinedFocus);
  await recordUsage({ userId: user?.id ?? undefined, anonId: anonId ?? undefined, kind: "review" });

  const headers = new Headers();
  if (anonId && !existingAnon) {
    headers.append(
      "Set-Cookie",
      `${ANON_COOKIE}=${anonId}; Path=/; Max-Age=${30 * 24 * 3600}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
  return Response.json(
    {
      ...result,
      fetchedCode: body.sourceUrl ? code : undefined,
      engine: llmReviewEnabled() ? result.engine : "heuristic",
      quota: { ...quota, used: quota.used + 1 },
    },
    { headers },
  );
}
