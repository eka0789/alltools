import { NextRequest, NextResponse } from "next/server";
import { respond } from "@/lib/chat/engine";
import { enhanceReply, llmEnabled } from "@/lib/chat/llm";
import type { ChatHistoryTurn } from "@/lib/chat/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;

// The public chat endpoint used to have zero protection and masked errors
// as HTTP 200 — both fixed here.
export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const limiter = rateLimit(`chat:${clientIp(req)}`, 20, 60_000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
    );
  }

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
    // Optional LLM polish (only when an API key is configured); the catalog
    // tool picks from the rule engine stay authoritative either way.
    const llmReply = llmEnabled() ? await enhanceReply(message, history, data) : null;
    return NextResponse.json(llmReply ? { ...data, reply: llmReply } : data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[chat] respond failed:", err);
    // Real 500 so monitoring and the client's res.ok check can tell failure
    // apart from success; the body stays user-friendly.
    return NextResponse.json(
      {
        intent: "fallback",
        responseLang: "en",
        reply:
          "Something went wrong on my side. 😅 Try asking again — or browse the catalog via Search.",
        tools: [],
        chips: ["Recommend tools for web dev", "What is Python?", "Data Scientist profile"],
      },
      { status: 500 },
    );
  }
}
