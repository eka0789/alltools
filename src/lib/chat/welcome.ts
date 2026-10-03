import type { ChatLang, ChatResponse } from "./types";

// Single source of truth for DevDict's welcome message — shared by the
// client panel (initial bubble) and the engine (greeting intent) so the two
// copies can never drift apart.

const FEATURES: Record<ChatLang, string> = {
  id: [
    "- 🧭 **Rekomendasi tools** — sebutkan kebutuhanmu, aku pilihkan dari katalog",
    "- 🎯 **Panduan profesi** — ceritakan bahasa favoritmu, aku tunjukkan jalur kariernya",
    "- 📚 **Kamus bahasa pemrograman** — tanya apa itu Python, Rust, dan lainnya",
    "- 🧱 **Rekomendasi stack** — tanya stack untuk web, mobile, data, dan lainnya",
  ].join("\n"),
  en: [
    "- 🧭 **Tool recommendations** — tell me what you need, I pick from the catalog",
    "- 🎯 **Career guidance** — share your favorite language, I'll map the career paths",
    "- 📚 **Programming language dictionary** — ask what Python, Rust, etc. are",
    "- 🧱 **Stack suggestions** — web, mobile, data, and more",
  ].join("\n"),
};

const CHIPS: Record<ChatLang, string[]> = {
  id: [
    "Rekomendasi tools untuk web",
    "Aku suka Python, cocok profesi apa?",
    "Apa itu TypeScript?",
    "Stack untuk aplikasi mobile",
  ],
  en: [
    "Best tools for web dev",
    "I like Python, which career fits?",
    "What is TypeScript?",
    "Mobile app stack",
  ],
};

export function welcomeChips(lang: ChatLang): string[] {
  return CHIPS[lang];
}

export function welcomeReply(lang: ChatLang, greeting?: string): ChatResponse {
  const id = lang === "id";
  const hello = greeting ?? (id ? "Halo!" : "Hello!");
  return {
    intent: "greeting",
    responseLang: lang,
    reply: [
      `${hello} 👋 ${id ? "Aku" : "I'm"} **DevDict AI** — ${id ? "asisten Developer Dictionary dari AllTools" : "the AllTools Developer Dictionary assistant"}.`,
      FEATURES[lang],
      id
        ? "Mau mulai dari mana? Ketuk salah satu di bawah, atau langsung tanya. 😄"
        : "Where shall we start? Tap a suggestion below, or just ask. 😄",
    ].join("\n\n"),
    tools: [],
    chips: CHIPS[lang],
  };
}
