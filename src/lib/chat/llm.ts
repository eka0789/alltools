import type { ChatHistoryTurn, ChatResponse } from "./types";

// Optional LLM upgrade for DevDict. Entirely opt-in: with no LLM_API_KEY /
// OPENAI_API_KEY configured, the rule-based engine answers exactly as
// before. When a key IS set (OpenAI-compatible endpoint), the model rewrites
// the reply prose — but the tool picks, links and chips stay authoritative
// from the catalog-driven rule engine, so recommendations can't be invented.

const API_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const BASE_URL = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 15_000;

export function llmEnabled(): boolean {
  return API_KEY !== "";
}

function systemPrompt(base: ChatResponse, toolNames: string[]): string {
  const id = base.responseLang === "id";
  return [
    id
      ? "Kamu adalah DevDict AI, asisten Developer Dictionary dari situs direktori AllTools."
      : "You are DevDict AI, the Developer Dictionary assistant of the AllTools directory site.",
    id
      ? "Gaya: ramah, ringkas, membantu. Jawab HANYA dalam Bahasa Indonesia."
      : "Style: friendly, concise, helpful. Reply in ENGLISH only.",
    id
      ? "Format: subset markdown-lite — **tebal**, *miring*, `kode`, baris berawalan '- ' untuk bullet. Tanpa heading/HTML."
      : "Format: markdown-lite subset — **bold**, *italic*, `code`, '- ' lines for bullets. No headings/HTML.",
    id
      ? "ATURAN PENTING: jangan mengarang tools/link/URL/data apa pun. Kandidat tools dari katalog tercantum di bawah — rujuk hanya itu. Jika jawaban butuh sesuatu di luar katalog, jelaskan konsepnya tanpa mengarang nama produk."
      : "HARD RULE: never invent tools/links/URLs/data. Catalog tool candidates are listed below — reference only those. If the answer needs something outside the catalog, explain the concept without inventing products.",
    id
      ? "Maksimal ~120 kata."
      : "At most ~120 words.",
    id
      ? `Kandidat katalog: ${toolNames.length > 0 ? toolNames.join(", ") : "(tidak ada)"}.`
      : `Catalog candidates: ${toolNames.length > 0 ? toolNames.join(", ") : "(none)"}.`,
  ].join(" ");
}

export async function enhanceReply(
  message: string,
  history: ChatHistoryTurn[],
  base: ChatResponse,
): Promise<string | null> {
  if (!llmEnabled()) return null;
  // Canned intents are already optimal — don't pay LLM latency for them.
  if (["greeting", "thanks", "help"].includes(base.intent)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt(base, base.tools.map((t) => `${t.name} (${t.description})`)) },
          ...history.slice(-6).map((h) => ({
            role: h.role === "user" ? ("user" as const) : ("assistant" as const),
            content: h.text,
          })),
          { role: "user", content: message },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    // Sanity guard: an empty or absurdly long reply falls back to rule-based.
    if (!content || content.length < 2 || content.length > 2000) return null;
    return content;
  } catch {
    return null; // any LLM trouble → keep the rule-based reply
  } finally {
    clearTimeout(timer);
  }
}
