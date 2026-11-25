import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db/client";
import { sharedStacks } from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { clientIp, rateLimitPersistent } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/stacks/share — { title, description?, slugs: string[], authorLabel? }
export async function POST(req: NextRequest) {
  if (!(await rateLimitPersistent(`share-stack:${clientIp(req)}`, 10, 60_000)).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: {
    title?: string;
    description?: string;
    slugs?: unknown;
    authorLabel?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim().slice(0, 80);
  const description = String(body.description ?? "").trim().slice(0, 240);
  const authorLabel = String(body.authorLabel ?? "").trim().slice(0, 40) || null;
  if (title.length < 2) {
    return Response.json({ error: "title-too-short" }, { status: 400 });
  }

  const { bySlug } = getCatalog();
  const rawSlugs = Array.isArray(body.slugs) ? body.slugs : [];
  const validSlugs = [
    ...new Set(
      rawSlugs
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => bySlug.has(s)),
    ),
  ].slice(0, 30);

  if (validSlugs.length === 0) {
    return Response.json({ error: "no-valid-tools" }, { status: 400 });
  }

  const id = randomBytes(6).toString("base64url");
  await db.insert(sharedStacks).values({
    id,
    title,
    description,
    slugs: JSON.stringify(validSlugs),
    authorLabel,
    views: 0,
    createdAt: Date.now(),
  });

  return Response.json({ ok: true, id, url: `/stacks/shared/${id}` });
}
