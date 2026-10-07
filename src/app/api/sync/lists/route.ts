import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionUserByToken, getUserLists, putUserLists } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((s): s is string => typeof s === "string" && s.length <= 200))].slice(0, cap);
}

// GET — pull the signed-in user's synced lists.
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const user = raw ? await getSessionUserByToken(raw) : null;
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const lists = await getUserLists(user.id);
  return NextResponse.json(
    { email: user.email, ...lists },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// POST — push the client's current lists (client owns ordering; server
// replaces wholesale, capped like the local stores).
export async function POST(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const user = raw ? await getSessionUserByToken(raw) : null;
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { favorites?: unknown; compare?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await putUserLists(user.id, {
    favorites: cleanList(body.favorites, 100),
    compare: cleanList(body.compare, 4),
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
