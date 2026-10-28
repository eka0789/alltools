import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { reviewCode, llmReviewEnabled } from "@/lib/ai-review";
import { checkReviewQuota, recordUsage } from "@/lib/quota";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_CHARS = 20_000;
const ANON_COOKIE = "ak_anon";

// POST /api/review — { code, language, focus }
// Kuota: anonim 3/hari (cookie), login gratis 5/hari, Pro 200/hari.
// Anonim tanpa kuota sisa → 402 dengan hint login/upgrade.
export async function POST(req: NextRequest) {
  if (!rateLimit(`review:${clientIp(req)}`, 30, 60_000).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: { code?: string; language?: string; focus?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const code = (body.code ?? "").slice(0, MAX_CHARS);
  if (code.trim().length < 20) {
    return Response.json({ error: "code-too-short" }, { status: 400 });
  }

  const user = await getSessionUser();

  // Cookie anon id (untuk kuota tanpa login).
  const existingAnon = req.cookies.get(ANON_COOKIE)?.value;
  const anonId = user ? null : existingAnon ?? randomBytes(16).toString("hex");

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

  const result = await reviewCode(code, (body.language ?? "").slice(0, 40), (body.focus ?? "").slice(0, 200));
  await recordUsage({ userId: user?.id ?? undefined, anonId: anonId ?? undefined, kind: "review" });

  const headers = new Headers();
  if (anonId && !existingAnon) {
    headers.append(
      "Set-Cookie",
      `${ANON_COOKIE}=${anonId}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
  return Response.json(
    { ...result, engine: llmReviewEnabled() ? result.engine : "heuristic", quota },
    { headers },
  );
}
