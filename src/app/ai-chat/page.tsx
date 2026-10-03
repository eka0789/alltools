import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/data";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Compass, GraduationCap, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Chat — DevDict AI",
  description:
    "Tanya apa saja ke DevDict AI: rekomendasi developer tools, panduan profesi sesuai bahasa pemrograman favoritmu, kamus bahasa pemrograman, dan rekomendasi stack. Jawaban akurat langsung dari katalog AllTools.",
  alternates: { canonical: "/ai-chat" },
};

// Reads the live catalog for the stats row (same pattern as /about).
export const revalidate = 120;

const FEATURES = [
  {
    icon: Compass,
    title: "Rekomendasi Tools Pintar",
    desc: "Ceritakan kebutuhanmu dengan bahasa sehari-hari — DevDict AI memilihkan tools paling relevan dari katalog, lengkap dengan harga, kategori, dan tautannya.",
    example: "Rekomendasi tools untuk edit foto",
  },
  {
    icon: GraduationCap,
    title: "Panduan Profesi & Karier",
    desc: "Sebutkan bahasa pemrograman favoritmu, dan dapatkan profil profesi yang cocok — roadmap belajar, skills utama, dan tools yang dipakai di profesi tersebut.",
    example: "Aku suka Python, cocok profesi apa?",
  },
  {
    icon: Layers,
    title: "Kamus & Rekomendasi Stack",
    desc: "Kamus bahasa pemrograman (sejarah, kegunaan, framework) plus rekomendasi stack terbukti untuk web, mobile, backend, data, game, dan DevOps.",
    example: "Stack untuk bikin aplikasi mobile",
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
          — Tanya Apa Saja soal Dunia Developer
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Asisten cerdas {total.toLocaleString()} tools developer. Minta rekomendasi tools, gali
          profesi yang cocok dengan bahasa pemrograman favoritmu, atau tanya kamus bahasa —
          jawabannya akurat karena diambil langsung dari katalog AllTools.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="chip">🧰 {total.toLocaleString()} tools terindeks</span>
          <span className="chip">🗂️ {categories.length} kategori</span>
          <span className="chip">🌍 16 bahasa pemrograman</span>
          <span className="chip">🎯 13 profil profesi</span>
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
          Apa yang bisa DevDict AI bantu?
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
        Ingin menjelajah manual? Buka{" "}
        <Link href="/categories" className="text-accent hover:underline">
          Categories
        </Link>{" "}
        atau{" "}
        <Link href="/stacks" className="text-accent hover:underline">
          Stack Explorer
        </Link>
        .
      </p>
    </div>
  );
}
