import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/data";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Compass, GraduationCap, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Chat — DevDict AI",
  description:
    "Ask DevDict AI anything: developer tool recommendations, career guidance based on your favorite programming language, a programming language dictionary, and stack suggestions. Accurate answers drawn straight from the AllTools catalog.",
  alternates: { canonical: "/ai-chat" },
};

// Reads the live catalog for the stats row (same pattern as /about).
export const revalidate = 120;

const FEATURES = [
  {
    icon: Compass,
    title: "Smart Tool Recommendations",
    desc: "Describe what you need in plain language — DevDict AI picks the most relevant tools from the catalog, complete with pricing, category, and links.",
    example: "Recommend tools for photo editing",
  },
  {
    icon: GraduationCap,
    title: "Career & Profession Guidance",
    desc: "Name your favorite programming language and get matching career profiles — learning roadmaps, core skills, and the tools used in that role.",
    example: "I like Python, which career fits?",
  },
  {
    icon: Layers,
    title: "Language Dictionary & Stacks",
    desc: "A programming language dictionary (history, use cases, frameworks) plus proven stack suggestions for web, mobile, backend, data, game, and DevOps.",
    example: "Stack for building a mobile app",
  },
];

export default function AiChatPage() {
  const { total, categories } = getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* hero */}
      <section className="relative text-center">
        <div className="hero-grid pointer-events-none absolute inset-x-0 -top-10 h-56" aria-hidden />
        <span className="tag-badge !text-accent mx-auto inline-flex items-center gap-1.5 !bg-accent-soft !px-3 !py-1">
          ✨ AI Assistant
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
            DevDict AI
          </span>{" "}
          — Ask Anything About the Developer World
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          A smart assistant for {total.toLocaleString()} developer tools. Ask for tool
          recommendations, explore careers that match your favorite language, or query the
          language dictionary — answers stay accurate because they come straight from the
          AllTools catalog.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="chip">🧰 {total.toLocaleString()} tools indexed</span>
          <span className="chip">🗂️ {categories.length} categories</span>
          <span className="chip">🌍 26 programming languages</span>
          <span className="chip">🎯 13 career profiles</span>
        </div>
      </section>

      {/* chat */}
      <section className="card mt-8 overflow-hidden shadow-xl shadow-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-accent to-accent-hover px-5 py-3.5 text-accent-foreground">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              ✨
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-success" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">DevDict AI</p>
              <p className="text-[11px] leading-tight text-accent-foreground/80">
                Developer Dictionary Assistant · Online
              </p>
            </div>
          </div>
          <span className="hidden text-[11px] text-accent-foreground/70 sm:block">
            Bilingual · Bahasa Indonesia &amp; English
          </span>
        </div>
        <div className="h-[68vh] min-h-[460px]">
          <ChatPanel variant="page" />
        </div>
      </section>

      {/* features */}
      <section className="mt-10">
        <h2 className="text-center text-lg font-semibold tracking-tight">
          What can DevDict AI help with?
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card flex flex-col gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold leading-snug">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <p className="mt-auto rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                💬 “{f.example}”
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Prefer browsing manually? Open{" "}
        <Link href="/categories" className="text-accent hover:underline">
          Categories
        </Link>{" "}
        or the{" "}
        <Link href="/stacks" className="text-accent hover:underline">
          Stack Explorer
        </Link>
        .
      </p>
    </div>
  );
}
