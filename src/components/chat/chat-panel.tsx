"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, Send, Sparkles } from "lucide-react";
import { ToolLogo } from "@/components/tool-logo";
import { PRICING_LABEL, type Pricing } from "@/data/types";
import type { ChatResponse, ChatToolRef } from "@/lib/chat/types";
import { welcomeReply } from "@/lib/chat/welcome";

// ── Markdown-lite rendering (**bold**, *italic*, `code`, bullets) ───────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={key} className="text-muted-foreground">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function ReplyText({ text }: { text: string }) {
  const blocks = text.split("\n\n");
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isBullets = lines.length > 0 && lines.every((l) => /^\s*[-•]\s+/.test(l));
        const isOrdered = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));
        if (isBullets || isOrdered) {
          const ListTag = isOrdered ? "ol" : "ul";
          return (
            <ListTag
              key={bi}
              className={`space-y-1.5 pl-1 ${isOrdered ? "list-none" : "list-none"}`}
            >
              {lines.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span className="select-none text-accent" aria-hidden>
                    {isOrdered ? `${li + 1}.` : "•"}
                  </span>
                  <span>{renderInline(line.replace(/^\s*(?:[-•]|\d+\.)\s+/, ""), `${bi}-${li}`)}</span>
                </li>
              ))}
            </ListTag>
          );
        }
        return <p key={bi}>{renderInline(block, String(bi))}</p>;
      })}
    </div>
  );
}

// ── Tool row inside a bot message ───────────────────────────────────────

const PRICING_STYLE: Record<string, string> = {
  free: "text-success",
  freemium: "text-warning",
  paid: "text-muted-foreground",
};

function ChatToolRow({ tool }: { tool: ChatToolRef }) {
  return (
    <div className="card flex items-center gap-2.5 p-2.5 transition-colors hover:border-accent/40">
      <ToolLogo url={tool.url} name={tool.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/tools/${tool.slug}`}
            className="truncate text-sm font-medium hover:text-accent"
          >
            {tool.name}
          </Link>
          <span
            className={`shrink-0 text-[10px] font-medium ${PRICING_STYLE[tool.pricing] ?? "text-muted-foreground"}`}
          >
            {PRICING_LABEL[(tool.pricing as Pricing) in PRICING_LABEL ? (tool.pricing as Pricing) : "free"]}
          </span>
          {tool.openSource && <span className="tag-badge shrink-0 hidden sm:inline-flex">OSS</span>}
        </div>
        <span className="block truncate text-xs text-muted-foreground">
          {tool.categoryName} · {tool.description}
        </span>
      </div>
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${tool.name} website`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Message model & storage ─────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: "user" | "bot";
  text?: string; // user messages
  data?: ChatResponse; // bot messages
  pending?: boolean;
  failed?: boolean; // network failure — offers a retry
  prompt?: string; // original user text of a failed turn
}

const STORAGE_KEY = "alltools-devdict-history";

// The site's chrome is English; the bot itself answers in the user's
// language, so the static welcome bubble uses English and follow-up replies
// switch per-message.
const WELCOME = welcomeReply("en");

// Must be called post-mount only: reading sessionStorage during render makes
// the hydrated tree differ from SSR and trips a hydration mismatch.
function loadStoredMessages(): ChatMsg[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMsg[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // private mode / quota — start fresh
  }
  return null;
}

// ── Typing indicator ────────────────────────────────────────────────────

function TypingBubble() {
  return (
    <div className="chat-msg flex items-center gap-2.5">
      <BotAvatar />
      <div className="card flex items-center gap-1.5 px-4 py-3" aria-label="DevDict AI is typing">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "160ms" }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "320ms" }} />
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-accent-foreground shadow-sm">
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────

export function ChatPanel({ variant }: { variant: "page" | "widget" }) {
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    { id: "welcome", role: "bot", data: WELCOME },
  ]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const nextId = () => `m-${++idCounter.current}`;

  // restore the conversation after mount (sessionStorage). Reading storage
  // during render trips hydration, and the lint rule forbids sync setState
  // in effects — a microtask satisfies both.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = loadStoredMessages();
      if (stored) setMessages(stored);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't clobber storage with the initial welcome
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.pending)));
    } catch {
      // ignore quota errors
    }
  }, [messages, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    // Follow the conversation only while the user is near the bottom —
    // force-scrolling yanks the view away while they're reading history.
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      // The engine only reads user turns; sending user turns alone keeps
      // the payload small.
      const history = messages
        .filter((m) => m.role === "user" && !m.pending)
        .slice(-8)
        .map((m) => ({ role: "user" as const, text: m.text ?? "" }));

      const userMsg: ChatMsg = { id: nextId(), role: "user", text };
      const botId = nextId();
      setMessages((prev) => [...prev, userMsg, { id: botId, role: "bot", pending: true }]);
      setInput("");
      setBusy(true);

      // A hung request used to leave the composer disabled forever.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ChatResponse;
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { id: botId, role: "bot", data } : m)),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  id: botId,
                  role: "bot",
                  failed: true,
                  prompt: text,
                  data: {
                    intent: "fallback",
                    responseLang: "en",
                    reply: "The connection to the assistant dropped. 😅 Please try again.",
                    tools: [],
                    chips: ["Best tools for web dev", "What is Python?"],
                  },
                }
              : m,
          ),
        );
      } finally {
        clearTimeout(timeout);
        setBusy(false);
      }
    },
    [busy, messages],
  );

  function retry(text: string) {
    // Drop the failed bubble and resend.
    setMessages((prev) => {
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "bot" && prev[i].failed) {
          idx = i;
          break;
        }
      }
      return idx === -1 ? prev : [...prev.slice(0, idx)];
    });
    void send(text);
  }

  function reset() {
    setMessages([{ id: "welcome", role: "bot", data: WELCOME }]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  const lastBotIndex = [...messages].reverse().findIndex((m) => m.role === "bot" && m.data && !m.pending);
  const lastBotAbs = lastBotIndex === -1 ? -1 : messages.length - 1 - lastBotIndex;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className={`chat-scroll flex-1 space-y-4 overflow-y-auto px-3 py-4 ${variant === "page" ? "sm:px-5" : ""}`}
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={msg.id} className="chat-msg flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-foreground shadow-sm">
                {msg.text}
              </div>
            </div>
          ) : msg.pending ? (
            <TypingBubble key={msg.id} />
          ) : msg.data ? (
            <div key={msg.id} className="chat-msg space-y-3">
              <div className="flex items-start gap-2.5">
                <BotAvatar />
                <div className="max-w-[92%] min-w-0 space-y-2 text-sm leading-relaxed">
                  <div className="card px-4 py-3">
                    <ReplyText text={msg.data.reply} />
                  </div>
                  {msg.data.tools.length > 0 && (
                    <div className="space-y-2">
                      {msg.data.tools.map((tool) => (
                        <ChatToolRow key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  )}
                  {msg.data.links && msg.data.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.data.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {link.label}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {i === lastBotAbs && msg.data.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.data.chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => send(chip)}
                          className="chip !rounded-full !border-accent/30 !text-accent hover:!bg-accent-soft"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.failed && (
                    <button
                      type="button"
                      onClick={() => retry(msg.prompt ?? "")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null,
        )}
      </div>

      {/* input */}
      <div className="border-t border-border bg-card/60 p-3 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={reset}
            aria-label="Reset conversation"
            title="Reset conversation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tools, careers, or languages…"
            aria-label="Ask DevDict AI"
            className="input flex-1 rounded-full !px-4"
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 hidden text-center text-[10px] text-muted-foreground sm:block">
          Answers come straight from the{" "}
          <span className="font-medium text-foreground/70">AllTools catalog</span> — no external data.
        </p>
      </div>
    </div>
  );
}
