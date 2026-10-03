import { NextRequest, NextResponse } from "next/server";
import { respond } from "@/lib/chat/engine";
import type { ChatHistoryTurn } from "@/lib/chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let message = "";
  let history: ChatHistoryTurn[] = [];
  try {
    const body = (await req.json()) as {
      message?: unknown;
      history?: unknown;
    };
    if (typeof body?.message === "string") message = body.message.slice(0, 1000);
    if (Array.isArray(body?.history)) {
      history = body.history
        .filter(
          (t): t is ChatHistoryTurn =>
            typeof t === "object" &&
            t !== null &&
            (t as ChatHistoryTurn).role === "user" &&
            typeof (t as ChatHistoryTurn).text === "string",
        )
        .slice(-8)
        .map((t) => ({ role: "user", text: (t.text as string).slice(0, 500) }));
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const data = respond(message, history);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[chat] respond failed:", err);
    return NextResponse.json({
      intent: "fallback",
      responseLang: "id",
      reply:
        "Waduh, ada gangguan di sisi aku. 😅 Coba tanya sekali lagi ya — atau jelajahi katalog lewat menu Search.",
      tools: [],
      chips: ["Rekomendasi tools untuk web", "Apa itu Python?", "Profil Data Scientist"],
    });
  }
}
