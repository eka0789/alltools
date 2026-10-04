import type { ToolWithMeta } from "@/lib/data";
import { getCatalog } from "@/lib/data";
import { searchTools } from "@/lib/search";
import { GLOSSARY, type GlossaryTerm } from "@/data/glossary";
import { CAREERS, LANGUAGES, type CareerProfile, type LanguageProfile } from "./knowledge";
import { welcomeReply } from "./welcome";
import type { ChatHistoryTurn, ChatLang, ChatLink, ChatResponse, ChatToolRef } from "./types";
// ── Text helpers ────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstSentence(text: string): string {
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : text).trim();
}

function langBySlug(slug: string): LanguageProfile | undefined {
  return LANGUAGES.find((l) => l.slug === slug);
}

function careerBySlug(slug: string): CareerProfile | undefined {
  return CAREERS.find((c) => c.slug === slug);
}

function categoryName(slug: string): string {
  return getCatalog().categories.find((c) => c.slug === slug)?.name ?? slug;
}

// ── Language detection ──────────────────────────────────────────────────
// Aliases that collide with everyday words ("how to go from junior to
// senior"). They only count as a language mention when the message carries
// language-ish intent, or when the message is just the alias itself.
const AMBIGUOUS_ALIASES = new Set(["go", "dart", "swift", "c"]);

// One regex per alias (precompiled), with word-boundary lookarounds so
// "javascript" doesn't match the "java" pattern.

const LANG_ALIAS_RES: { slug: string; re: RegExp; ambiguous: boolean }[] =
  LANGUAGES.flatMap((l) =>
    l.aliases.map((a) => ({
      slug: l.slug,
      re: new RegExp(`(?<![\\w#+])(${esc(a)})(?![\\w#+])`, "i"),
      ambiguous: AMBIGUOUS_ALIASES.has(a.toLowerCase()),
    })),
  );

function hasLangContext(text: string): boolean {
  return /\b(apa itu|what is|what's|belajar|learn|language|bahasa|code|coding|rekomendasi|recommend|tool|tools|profesi|career|cocok|stack|vs\.?\s|pake|pakai|use|using|ketik|typed|written|ditulis|developer)\b/i.test(
    text,
  );
}

function detectLangs(text: string): string[] {
  const contextual =
    hasLangContext(text) || AMBIGUOUS_ALIASES.has(text.trim().toLowerCase());
  const found: string[] = [];
  const seen = new Set<string>();
  for (const { slug, re, ambiguous } of LANG_ALIAS_RES) {
    if (seen.has(slug) || !re.test(text)) continue;
    if (ambiguous && !contextual) continue;
    seen.add(slug);
    found.push(slug);
  }
  return found;
}

// ── Career detection ────────────────────────────────────────────────────
// Strong alias mention weight 2, weak interest signal weight 1.

const CAREER_RES: { career: CareerProfile; strong: RegExp; weak: RegExp }[] = CAREERS.map(
  (career) => ({
    career,
    strong: new RegExp(`\\b(${career.aliases.map(esc).join("|")})`, "i"),
    weak: new RegExp(`\\b(${career.interests.map(esc).join("|")})`, "i"),
  }),
);

function detectCareers(text: string): { career: CareerProfile; score: number }[] {
  const scored: { career: CareerProfile; score: number }[] = [];
  for (const { career, strong, weak } of CAREER_RES) {
    let score = 0;
    if (strong.test(text)) score += 2;
    if (weak.test(text)) score += 1;
    if (score > 0) scored.push({ career, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

// ── Response language (id vs en) ────────────────────────────────────────

const ID_MARKERS =
  /\b(apa|apakah|yang|untuk|saya|aku|gw|gue|suka|mau|ingin|butuh|cari|rekomendasi|cocok|profesi|karir|karier|pekerjaan|belajar|bikin|bangun|gimana|bagaimana|kenapa|dong|sih|nih|aja|minat|banget|paling|tolong|boleh|keren|mantap|makasih|terima)\b/i;
const EN_MARKERS =
  /\b(what|whats|which|how|why|should|recommend|suggest|best|learn|career|become|suited|interested|want|need|please|thanks|hello|the|and|for|with|from|or|is|are|can|does|do|my|your)\b/i;

function detectResponseLang(text: string): ChatLang {
  const id = ID_MARKERS.test(text);
  const en = EN_MARKERS.test(text);
  if (en && !id) return "en";
  return "id"; // ambiguous or Indonesian → Indonesian
}

// ── Intent regexes (bilingual) ──────────────────────────────────────────

const RE = {
  greeting:
    /^(hai|hi|halo|hallo|hello|hey|hei|selamat (pagi|siang|sore|malam)|good (morning|afternoon|evening)|assalamualaikum)[\s!.,?]*(kak|bang|bro|sob|devdict|alltools)?[\s!.,?]*$/i,
  thanks: /\b(makasih|terima ?kasih|thanks|thank you|thx)\b/i,
  help: /\b(bantuan|bantu aku|help me|bisa apa|fitur apa|cara pakai|cara pake|panduan|apa aja sih|apa saja sih|kamu bisa apa|what can you|what do you do|how does this work|how to use)\b/i,
  career:
    /\b(profesi|karir|karier|career|pekerjaan|jobs?|jurusan|minat|cocok|role|jadi\s|menjadi|mau jadi|ingin jadi|pengen jadi|become|becoming|what should i|which (career|role|path)|suited|sesuai)\b/i,
  recommend:
    /\b(rekomendasi|rekomendasikan|recommend|suggestion|suggest|saran|butuh|need|tools? (apa|untuk|for)|cari|mencari|looking for|apa yang (dipakai|digunakan|dipake)|pakai apa|pake apa|what tool|any tool|tool for|tools for|best (tool|editor|app))\b/i,
  stack:
    /\b(stack|tech stack|teknologi|technology|framework apa|membangun|membuat aplikasi|build an? (app|web|api))\b/i,
  langinfo:
    /\b(apa itu|what is|what's|apa sih|tentang|about|jelaskan|explain|sejarah|history|kenalan|introduction|kelebihan|advantages|pros and cons|bedanya|difference| vs )\b/i,
  learn: /\b(belajar|learn|mulai dari mana|pemula|beginner|from scratch|newbie|roadmap)\b/i,
};

// ── Topic extraction for tool search ────────────────────────────────────

const FILLER =
  /\b(rekomendasi|rekomendasikan|recommendation|recommend|recommended|suggestion|suggest|saran|butuh|need|apa|apakah|itu|what|which|tool|tools|aplikasi|app|apps|software|untuk|for|yang|dengan|with|dan|and|atau|or|bagus|good|best|terbaik|top|populer|popular|gratis|gratisan|free|cari|mencari|looking|find|kasih|tolong|please|dong|donk|deh|ya|saja|aja|jenis|list|daftar|pake|pakai|use|dipakai|digunakan|aku|saya|suka|like|favorit|favorite|senang|banget|sekali|nih|sih|ada|kayak|seperti|buat|bikin|kamu|kalian|anda)\b/gi;

const ID_TERM_MAP: [RegExp, string][] = [
  [/\bfoto(s)?\b/gi, "photo image"],
  [/\bgambar(s)?\b/gi, "image"],
  [/\bwarna\b/gi, "color palette"],
  [/\bdesain\b/gi, "design"],
  [/\bkeamanan\b/gi, "security"],
  [/\b(menguji|uji coba|uji)\b/gi, "testing"],
  [/\bhosting(t)?\b/gi, "hosting deploy"],
  [/\bcatatan\b/gi, "notes note-taking"],
  [/\bdokumen\b/gi, "document"],
  [/\bbasis data\b/gi, "database"],
  [/\bpelajaran\b/gi, "learning"],
  [/\bnode(\.js|js)?\b/gi, "node.js"],
];

function extractTopic(text: string): string {
  let t = text.replace(FILLER, " ");
  // translate common Indonesian terms in place so the search engine sees
  // its own vocabulary (searchTools works on English-ish tokens)
  for (const [re, en] of ID_TERM_MAP) {
    t = t.replace(re, ` ${en} `);
  }
  return t.replace(/\s+/g, " ").trim();
}

// ── Tool matching against the catalog ───────────────────────────────────

function toToolRef(t: ToolWithMeta): ChatToolRef {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    categoryName: t.categoryName,
    categorySlug: t.categorySlug,
    pricing: t.pricing,
    url: t.url,
    openSource: t.openSource,
  };
}

/** Score catalog tools by category + tag overlap (and optional language). */
function toolsByProfile(
  categories: string[],
  tags: string[],
  lang?: string,
  limit = 4,
): ChatToolRef[] {
  const catalog = getCatalog();
  const tagSet = new Set(tags.map(norm));
  const scored: { t: ToolWithMeta; score: number }[] = [];
  for (const t of catalog.tools) {
    if (t.status === "deprecated") continue;
    const inCat = categories.includes(t.categorySlug);
    let tagHits = 0;
    for (const tag of t.tags) {
      if (tagSet.has(norm(tag))) tagHits += 1;
    }
    if (!inCat && tagHits === 0) continue;
    let score = tagHits * 3 + (inCat ? 2 : 0) + (t.featured ? 1 : 0);
    if (lang && t.languages.map(norm).includes(lang)) score += 3;
    if (score <= 0) continue;
    scored.push({ t, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.t.featured) - Number(a.t.featured) ||
      a.t.name.localeCompare(b.t.name),
  );
  return scored.slice(0, limit).map((s) => toToolRef(s.t));
}

function toolsBySearch(query: string, limit = 6): ChatToolRef[] {
  if (!query) return [];
  // facets:false — chat never renders facet counts, and skipping them saves
  // two full-index passes per message.
  return searchTools({ q: query, perPage: limit, facets: false }).items.map(toToolRef);
}

function toolsByLang(lang: string, limit = 4): ChatToolRef[] {
  const byFilter = searchTools({ filters: { lang }, perPage: limit, sort: "name", facets: false }).items;
  if (byFilter.length > 0) return byFilter.map(toToolRef);
  return toolsByProfile(["programming"], [lang], lang, limit);
}

// ── Context carry from history ──────────────────────────────────────────
// Follow-ups like "yang gratis aja dong" only make sense with the previous
// subject, so the engine carries the last language / career / topic from
// earlier user turns.

function carryFromHistory(history: ChatHistoryTurn[]): {
  langs: string[];
  career: CareerProfile | null;
  topic: string;
} {
  let langs: string[] = [];
  let career: CareerProfile | null = null;
  let topic = "";
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role !== "user") continue;
    if (langs.length === 0) langs = detectLangs(turn.text);
    if (!career) {
      const careers = detectCareers(turn.text).filter((c) => c.score >= 2);
      if (careers.length > 0) career = careers[0].career;
    }
    if (!topic) {
      const t = extractTopic(turn.text);
      if (t.length >= 3) topic = t;
    }
    if (langs.length > 0 && career && topic) break;
  }
  return { langs, career, topic };
}

// ── Stack plans (per domain) ────────────────────────────────────────────

type Domain = "web" | "mobile" | "api" | "data" | "game" | "devops";

const DOMAIN_RE: [Domain, RegExp][] = [
  ["mobile", /\b(mobile|android|ios|aplikasi hp|aplikasi mobile|app store|flutter)\b/i],
  ["game", /\b(game|gaming|unity|unreal|godot)\b/i],
  ["data", /\b(data|analitik|analytics|dashboard|machine learning|ml|kecerdasan buatan)\b/i],
  ["devops", /\b(devops|deploy|server|cloud|ci\/cd|infrastruktur|docker|kubernetes)\b/i],
  ["api", /\b(api|rest|graphql|backend|microservice)\b/i],
  ["web", /\b(web|website|situs|aplikasi web|web app|landing|e-?commerce|blog)\b/i],
];

const STACK_PLANS: Record<
  Domain,
  { id: string[]; en: string[]; cats: string[]; tags: string[]; career: string }
> = {
  web: {
    id: [
      "Framework UI: **Next.js / React** (atau Astro kalau konten-heavy)",
      "Styling: **Tailwind CSS** + component library (shadcn/ui)",
      "Backend & DB: **PostgreSQL** + Prisma/Drizzle",
      "Deploy: **Vercel / Netlify**, error monitoring dengan Sentry",
    ],
    en: [
      "UI framework: **Next.js / React** (or Astro for content-heavy sites)",
      "Styling: **Tailwind CSS** + a component library (shadcn/ui)",
      "Backend & DB: **PostgreSQL** + Prisma/Drizzle",
      "Deploy: **Vercel / Netlify**, error monitoring with Sentry",
    ],
    cats: ["frontend", "css", "backend", "database", "cloud"],
    tags: ["react", "next.js", "tailwind", "orm", "hosting", "fullstack"],
    career: "frontend-dev",
  },
  mobile: {
    id: [
      "Jalur: **Flutter (Dart)** untuk lintas platform, atau **Kotlin / Swift** untuk native",
      "Backend: **Firebase / Supabase** untuk auth & database instan",
      "Debugging & testing: **REST client (Postman)** + device testing",
      "Rilis: Play Console / App Store Connect + crash reporting (Sentry)",
    ],
    en: [
      "Path: **Flutter (Dart)** for cross-platform, or **Kotlin / Swift** for native",
      "Backend: **Firebase / Supabase** for instant auth & database",
      "Debugging & testing: **REST client (Postman)** + device testing",
      "Release: Play Console / App Store Connect + crash reporting (Sentry)",
    ],
    cats: ["mobile", "api", "backend"],
    tags: ["mobile", "flutter", "react native", "testing"],
    career: "mobile-dev",
  },
  api: {
    id: [
      "Framework: **FastAPI / Express / Laravel** sesuai bahasamu",
      "Database: **PostgreSQL** + ORM (Prisma, Drizzle, SQLAlchemy)",
      "Testing & debugging: **Postman / Insomnia** + mocking",
      "Infra: **Docker**, auth dengan JWT/OAuth",
    ],
    en: [
      "Framework: **FastAPI / Express / Laravel** per your language",
      "Database: **PostgreSQL** + an ORM (Prisma, Drizzle, SQLAlchemy)",
      "Testing & debugging: **Postman / Insomnia** + mocking",
      "Infra: **Docker**, auth with JWT/OAuth",
    ],
    cats: ["backend", "api", "database"],
    tags: ["api", "rest", "orm", "auth", "mocking", "docker"],
    career: "backend-dev",
  },
  data: {
    id: [
      "Bahasa: **Python** (Pandas, NumPy) + **SQL** untuk query",
      "Notebook: **Jupyter / Google Colab** untuk eksplorasi",
      "Visualisasi: **Tableau / Looker / Streamlit**",
      "ML: **scikit-learn → PyTorch**, experiment tracking (W&B)",
    ],
    en: [
      "Language: **Python** (Pandas, NumPy) + **SQL** for queries",
      "Notebook: **Jupyter / Google Colab** for exploration",
      "Visualization: **Tableau / Looker / Streamlit**",
      "ML: **scikit-learn → PyTorch**, experiment tracking (W&B)",
    ],
    cats: ["ai", "database", "sql"],
    tags: ["analytics", "notebook", "visualization", "llm", "vector"],
    career: "data-scientist",
  },
  game: {
    id: [
      "Engine: **Unity (C#)** ramah pemula, **Godot** gratis & ringan, **Unreal** untuk AAA",
      "Aset & seni: **Blender** + texture/material tools",
      "Audio: SFX libraries open-source",
      "Version control: **Git + Git LFS** untuk aset besar",
    ],
    en: [
      "Engine: **Unity (C#)** beginner-friendly, **Godot** free & light, **Unreal** for AAA",
      "Art assets: **Blender** + texture/material tools",
      "Audio: open-source SFX libraries",
      "Version control: **Git + Git LFS** for large assets",
    ],
    cats: ["programming", "design", "media", "git"],
    tags: ["game", "graphics", "3d", "animation"],
    career: "game-dev",
  },
  devops: {
    id: [
      "Container: **Docker** + compose untuk lokal",
      "CI/CD: **GitHub Actions** (atau GitLab CI)",
      "IaC: **Terraform**, orkestrasi **Kubernetes** saat skala besar",
      "Monitoring: **Prometheus + Grafana**, log dengan Loki",
    ],
    en: [
      "Containers: **Docker** + compose locally",
      "CI/CD: **GitHub Actions** (or GitLab CI)",
      "IaC: **Terraform**, **Kubernetes** once you scale",
      "Monitoring: **Prometheus + Grafana**, logs with Loki",
    ],
    cats: ["devops", "cloud", "monitoring", "git"],
    tags: ["docker", "ci-cd", "iac", "kubernetes", "monitoring"],
    career: "devops-engineer",
  },
};

function detectDomain(text: string): Domain {
  for (const [d, re] of DOMAIN_RE) {
    if (re.test(text)) return d;
  }
  return "web";
}

// ── Reply composers ─────────────────────────────────────────────────────

function chipsForLangProfiles(lang: LanguageProfile): string[] {
  const chips = lang.careers
    .slice(0, 2)
    .map((s) => careerBySlug(s))
    .filter((c): c is CareerProfile => Boolean(c))
    .map((c) => `Profil ${c.nameId}`);
  chips.push(`Rekomendasi tools ${lang.name}`);
  if (lang.stackSlug) chips.push(`Stack untuk ${lang.name}`);
  return chips;
}

function languageReply(lang: LanguageProfile, rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const careersLine = lang.careers
    .map((s) => careerBySlug(s)?.nameId ?? s)
    .slice(0, 4)
    .join(", ");

  const reply = id
    ? [
        `**${lang.name}** ${lang.emoji} — *${lang.taglineId}*`,
        lang.descId,
        [
          `- **Dibuat sejak:** ${lang.since}`,
          `- **Tingkat kesulitan:** ${lang.difficultyId}`,
          `- **Cocok untuk:** ${lang.useCases.join(", ")}`,
          `- **Framework populer:** ${lang.frameworks.join(", ")}`,
          `- **Profesi yang cocok:** ${careersLine}`,
        ].join("\n"),
        `💡 ${lang.factId}`,
      ].join("\n\n")
    : [
        `**${lang.name}** ${lang.emoji} — *${lang.taglineEn}*`,
        lang.descEn,
        [
          `- **Around since:** ${lang.since}`,
          `- **Difficulty:** ${lang.difficultyEn}`,
          `- **Great for:** ${lang.useCases.join(", ")}`,
          `- **Popular frameworks:** ${lang.frameworks.join(", ")}`,
          `- **Fitting careers:** ${careersLine}`,
        ].join("\n"),
        `💡 ${lang.factEn}`,
      ].join("\n\n");

  const links: ChatLink[] = [
    {
      label: id ? `Lihat semua tools ${lang.name}` : `All ${lang.name} tools`,
      href: `/search?lang=${encodeURIComponent(lang.slug)}`,
    },
  ];
  if (lang.stackSlug) {
    links.push({ label: id ? `Stack ${lang.name}` : `${lang.name} stack`, href: `/stacks/${lang.stackSlug}` });
  }

  return {
    intent: "language",
    responseLang: rl,
    reply,
    tools: toolsByLang(lang.slug, 4),
    chips: chipsForLangProfiles(lang),
    links,
  };
}

function careerReply(career: CareerProfile, langs: string[], rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const name = id ? career.nameId : career.nameEn;
  const desc = id ? career.descId : career.descEn;
  const outlook = id ? career.outlookId : career.outlookEn;
  const roadmap = id ? career.roadmapId : career.roadmapEn;

  const blocks: string[] = [`**${name}** ${career.emoji}`, desc, `🎯 ${outlook}`];

  // Accuracy guard: when the user's favorite language is unusual for this
  // career, say so honestly instead of pretending it fits.
  const careerLangs = career.langs
    .map(langBySlug)
    .filter((l): l is LanguageProfile => Boolean(l));
  const match = langs.find((l) => career.langs.includes(l));
  if (langs.length > 0 && !match) {
    const other = langBySlug(langs[0]);
    if (other) {
      blocks.push(
        id
          ? `⚠️ Catatan: ${other.name} jarang dipakai di ${name} — bahasa yang biasa dipakai: ${careerLangs
              .slice(0, 3)
              .map((l) => l.name)
              .join(", ")}.`
          : `⚠️ Note: ${other.name} is uncommon in ${name} — typical choices: ${careerLangs
              .slice(0, 3)
              .map((l) => l.name)
              .join(", ")}.`,
      );
    }
  } else if (match) {
    const other = langBySlug(match);
    if (other) {
      blocks.push(
        id
          ? `✅ Pilihan yang pas — ${other.name} memang bahasa utama di ${name}.`
          : `✅ Good fit — ${other.name} is a primary language for ${name}.`,
      );
    }
  }

  blocks.push((id ? "**Skills utama:** " : "**Core skills:** ") + career.skills.join(" · "));
  blocks.push(id ? "**Roadmap singkat:**" : "**Quick roadmap:**");
  blocks.push(roadmap.map((s, i) => `${i + 1}. ${s}`).join("\n"));

  const links: ChatLink[] = [
    {
      label: id
        ? `Jelajahi kategori ${categoryName(career.categories[0])}`
        : `Browse ${categoryName(career.categories[0])}`,
      href: `/search?category=${career.categories[0]}`,
    },
  ];
  if (career.stackSlug) {
    links.push({
      label: id ? `Stack ${career.stackSlug}` : `${career.stackSlug} stack`,
      href: `/stacks/${career.stackSlug}`,
    });
  }

  // chips: sibling careers that share this career's languages
  const siblingChips = [
    ...new Set(
      career.langs
        .flatMap((ls) => langBySlug(ls)?.careers ?? [])
        .filter((s) => s !== career.slug)
        .map((s) => careerBySlug(s))
        .filter((c): c is CareerProfile => Boolean(c))
        .map((c) => `Profil ${id ? c.nameId : c.nameEn}`),
    ),
  ].slice(0, 2);
  const chips = [...siblingChips, id ? "Rekomendasi tools untuk profesi ini" : "Tools for this career"];

  const primaryLang = match ?? career.langs[0];

  return {
    intent: "career",
    responseLang: rl,
    reply: blocks.join("\n\n"),
    tools: toolsByProfile(career.categories, career.tags, primaryLang, 4),
    chips,
    links,
  };
}

function careersForLangReply(langs: string[], rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const lang = langBySlug(langs[0]);
  const ranked = CAREERS.map((c) => ({
    c,
    hits: c.langs.filter((l) => langs.includes(l)).length,
  }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 4);

  const list = ranked
    .map(({ c }) => `- **${id ? c.nameId : c.nameEn}** ${c.emoji} — ${firstSentence(id ? c.descId : c.descEn)}`)
    .join("\n");

  const langName = lang?.name ?? langs[0];
  const reply = id
    ? [
        `Karena kamu menyukai **${langName}**, ini profesi-profesi yang paling cocok:`,
        list,
        "Ketuk profesi di bawah untuk profil lengkap + roadmap + rekomendasi tools-nya 👇",
      ].join("\n\n")
    : [
        `Since you like **${langName}**, here are the careers that fit best:`,
        list,
        "Tap a career below for the full profile + roadmap + tool picks 👇",
      ].join("\n\n");

  const chips = ranked.map(({ c }) => (id ? `Profil ${c.nameId}` : `Profil ${c.nameEn}`));

  const tools: ChatToolRef[] = [];
  for (const { c } of ranked.slice(0, 2)) {
    for (const t of toolsByProfile(c.categories, c.tags, langs[0], 2)) {
      if (!tools.some((x) => x.slug === t.slug)) tools.push(t);
    }
  }

  return {
    intent: "career-list",
    responseLang: rl,
    reply,
    tools: tools.slice(0, 4),
    chips,
  };
}

function careerListReply(rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const picks = [
    "frontend-dev",
    "backend-dev",
    "fullstack-dev",
    "mobile-dev",
    "data-scientist",
    "data-analyst",
    "ml-engineer",
    "devops-engineer",
    "security-engineer",
    "game-dev",
  ]
    .map(careerBySlug)
    .filter((c): c is CareerProfile => Boolean(c));

  const list = picks
    .map((c) => `- **${id ? c.nameId : c.nameEn}** ${c.emoji} — ${firstSentence(id ? c.descId : c.descEn)}`)
    .join("\n");

  const reply = id
    ? [
        "Ini peta profesi developer yang bisa kamu jelajahi:",
        list,
        "Biar rekomendasinya akurat — sebutkan **bahasa pemrograman favoritmu** (misal: *Aku suka Python, cocok profesi apa?*) ✨",
      ].join("\n\n")
    : [
        "Here's a map of developer careers you can explore:",
        list,
        "For accurate recommendations — tell me your **favorite programming language** (e.g. *I like Python, which career fits?*) ✨",
      ].join("\n\n");

  const chips = picks
    .slice(0, 3)
    .map((c) => (id ? `Profil ${c.nameId}` : `Profil ${c.nameEn}`));
  chips.push(id ? "Aku suka Python, cocok profesi apa?" : "I like Python, which career fits?");

  return { intent: "career-list", responseLang: rl, reply, tools: [], chips };
}

function recommendReply(
  text: string,
  topicQuery: string,
  langs: string[],
  career: CareerProfile | null,
  rl: ChatLang,
): ChatResponse {
  const id = rl === "id";
  const topic = extractTopic(topicQuery);
  const wantsFree = /\b(gratis|gratisan|free|tanpa bayar)\b/i.test(text);

  // The user asked for tools around a mentioned career
  if (career && (!topic || topic.length < 3)) {
    const res = careerReply(career, langs, rl);
    res.intent = "recommend";
    return res;
  }

  let tools: ChatToolRef[] = [];
  if (topic.length >= 2) {
    tools = toolsBySearch(topic, 6);
    if (wantsFree) {
      const freeOnly = searchTools({ q: topic, filters: { free: true }, perPage: 6 }).items;
      if (freeOnly.length > 0) tools = freeOnly.map(toToolRef);
    }
  } else if (wantsFree) {
    tools = searchTools({ filters: { free: true }, perPage: 6, sort: "name" }).items.map(toToolRef);
  }
  if (tools.length === 0 && langs.length > 0) tools = toolsByLang(langs[0], 6);
  if (tools.length === 0 && career) {
    tools = toolsByProfile(career.categories, career.tags, langs[0] ?? career.langs[0], 6);
  }
  if (tools.length === 0) return fallbackReply(text, topicQuery, rl);

  const langMention = langs.length > 0 ? langBySlug(langs[0]) : undefined;
  const connector = id ? " untuk " : " for ";
  const topicPart = topic ? `${connector}**${topic}**` : "";
  const lead = id
    ? langMention
      ? `Ini rekomendasi tools terbaik dari katalog AllTools${topicPart} — disesuaikan dengan preferensi **${langMention.name}** kamu:`
      : `Ini rekomendasi tools terbaik dari katalog AllTools${topicPart}:`
    : langMention
      ? `Here are the best tool picks from the AllTools catalog${topicPart} — matched to your **${langMention.name}** preference:`
      : `Here are the best tool picks from the AllTools catalog${topicPart}:`;

  const topCat = tools[0].categorySlug;
  const links: ChatLink[] = [
    {
      label: id ? `Lihat semua ${categoryName(topCat)}` : `All ${categoryName(topCat)}`,
      href: `/search?category=${topCat}`,
    },
  ];

  const chips = id
    ? ["Rekomendasi tools gratis", "Rekomendasi AI tools", "Profil Frontend Developer", "Stack untuk web"]
    : ["Free tool picks", "Recommend AI tools", "Frontend Developer profile", "Web stack"];

  return { intent: "recommend", responseLang: rl, reply: lead, tools, chips, links };
}

function stackReply(text: string, langs: string[], rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const domain = detectDomain(text);
  const plan = STACK_PLANS[domain];
  const lang = langs.length > 0 ? langBySlug(langs[0]) : undefined;

  const lines = id ? plan.id : plan.en;
  const langLine =
    lang && lang.frameworks.length > 0
      ? id
        ? `Bahasa utama: **${lang.name}** — ${lang.frameworks.slice(0, 3).join(", ")}`
        : `Primary language: **${lang.name}** — ${lang.frameworks.slice(0, 3).join(", ")}`
      : null;
  const bullets = langLine ? [langLine, ...lines] : lines;

  const domainLabel: Record<Domain, { id: string; en: string }> = {
    web: { id: "aplikasi web", en: "a web app" },
    mobile: { id: "aplikasi mobile", en: "a mobile app" },
    api: { id: "backend/API", en: "a backend/API" },
    data: { id: "proyek data & AI", en: "a data & AI project" },
    game: { id: "game", en: "a game" },
    devops: { id: "infrastruktur & deployment", en: "infrastructure & deployment" },
  };

  const reply = id
    ? [
        `Untuk membangun **${domainLabel[domain].id}**${lang ? ` dengan **${lang.name}**` : ""}, ini kombinasi stack yang populer dan terbukti:`,
        bullets.map((l) => `- ${l}`).join("\n"),
        "Tools di bawah adalah titik mulai dari katalog AllTools — jelajahi stack lengkapnya lewat tombol di bawah 👇",
      ].join("\n\n")
    : [
        `For building **${domainLabel[domain].en}**${lang ? ` with **${lang.name}**` : ""}, here's a popular, proven stack:`,
        bullets.map((l) => `- ${l}`).join("\n"),
        "The tools below are starting points from the AllTools catalog — explore the full stack via the button below 👇",
      ].join("\n\n");

  const stackSlug = lang?.stackSlug ?? careerBySlug(plan.career)?.stackSlug;
  const links: ChatLink[] = stackSlug
    ? [{ label: id ? `Buka stack ${stackSlug}` : `Open ${stackSlug} stack`, href: `/stacks/${stackSlug}` }]
    : [{ label: id ? "Jelajahi semua stacks" : "Browse all stacks", href: "/stacks" }];

  const chips = id
    ? ["Rekomendasi tools database", "Tools deploy & hosting", "Profil DevOps Engineer", "Rekomendasi AI tools"]
    : ["Database tool picks", "Deploy & hosting tools", "DevOps Engineer profile", "AI tool picks"];

  return {
    intent: "stack",
    responseLang: rl,
    reply,
    tools: toolsByProfile(plan.cats, plan.tags, langs[0], 6),
    chips,
    links,
  };
}

function greetingReply(rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const h = new Date().getHours();
  const timeGreeting = id
    ? h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam"
    : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return welcomeReply(rl, timeGreeting);
}

function helpReply(rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const reply = id
    ? [
        "Aku bisa bantu dengan 4 hal ini 🧠",
        [
          "- **Rekomendasi tools** → *\"tools untuk edit foto\"*, *\"rekomendasi API client gratis\"*",
          "- **Panduan profesi** → *\"aku suka Python, cocok jadi apa?\"*, *\"profil data scientist\"*",
          "- **Kamus bahasa** → *\"apa itu Rust?\"*, *\"TypeScript vs JavaScript\"*",
          "- **Rekomendasi stack** → *\"stack untuk bikin aplikasi mobile\"*",
        ].join("\n"),
        "Semua jawaban diambil langsung dari katalog AllTools, jadi rekomendasinya selalu sinkron dengan data terbaru.",
      ].join("\n\n")
    : [
        "I can help with 4 things 🧠",
        [
          "- **Tool recommendations** → *\"tools for photo editing\"*, *\"best free API client\"*",
          "- **Career guidance** → *\"I like Python, what fits?\"*, *\"data scientist profile\"*",
          "- **Language dictionary** → *\"what is Rust?\"*, *\"TypeScript vs JavaScript\"*",
          "- **Stack suggestions** → *\"stack for a mobile app\"*",
        ].join("\n"),
        "Every answer is drawn straight from the AllTools catalog, so recommendations always match the latest data.",
      ].join("\n\n");

  const chips = id
    ? ["Rekomendasi tools JSON", "Aku suka Go, cocok profesi apa?", "Apa itu Rust?", "Stack untuk web app"]
    : ["JSON tool picks", "I like Go, which career fits?", "What is Rust?", "Web app stack"];

  return { intent: "help", responseLang: rl, reply, tools: [], chips };
}

function thanksReply(rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const reply = id
    ? "Sama-sama! 😊 Kalau butuh rekomendasi tools lain atau mau eksplor profesi developer lain, aku selalu siap."
    : "You're welcome! 😊 Whenever you need more tool picks or want to explore another developer career, I'm here.";
  const chips = id
    ? ["Rekomendasi tools testing", "Profil Backend Developer", "Apa itu Go?"]
    : ["Testing tool picks", "Backend Developer profile", "What is Go?"];
  return { intent: "thanks", responseLang: rl, reply, tools: [], chips };
}

function fallbackReply(text: string, topicQuery: string, rl: ChatLang): ChatResponse {
  const id = rl === "id";
  const topic = extractTopic(topicQuery);
  const tools = topic.length >= 2 ? toolsBySearch(topic, 4) : [];
  if (tools.length > 0) {
    return {
      intent: "recommend",
      responseLang: rl,
      reply: id
        ? `Aku belum 100% yakin dengan maksud pertanyaannya — tapi berdasarkan kata kunci **${topic}**, ini yang paling relevan dari katalog:`
        : `I'm not 100% sure what you mean — but based on **${topic}**, these are the most relevant from the catalog:`,
      tools,
      chips: id
        ? ["Maksudku rekomendasi tools AI", "Apa itu Python?", "Profil Full-Stack Developer"]
        : ["I meant AI tool picks", "What is Python?", "Full-Stack Developer profile"],
    };
  }
  return {
    intent: "fallback",
    responseLang: rl,
    reply: id
      ? [
          "Wah, aku belum paham pertanyaannya. 🤔 Aku paling jago soal:",
          [
            "- 🧭 Rekomendasi **tools** dari katalog AllTools",
            "- 🎯 **Profesi** developer & roadmap belajar",
            "- 📚 **Kamus** bahasa pemrograman",
            "- 🧱 Rekomendasi **stack**",
          ].join("\n"),
          "Coba tanya dengan contoh di bawah ya!",
        ].join("\n\n")
      : [
          "Hmm, I didn't quite get that. 🤔 I'm best at:",
          [
            "- 🧭 **Tool** recommendations from the AllTools catalog",
            "- 🎯 Developer **careers** & learning roadmaps",
            "- 📚 Programming language **dictionary**",
            "- 🧱 **Stack** suggestions",
          ].join("\n"),
          "Try one of the examples below!",
        ].join("\n\n"),
    tools: [],
    chips: greetingReply(rl).chips,
  };
}

// ── Glossary lookups ────────────────────────────────────────────────────
// "apa itu ORM", "what is SSR" → answer from the developer glossary, with
// its linked tools. Longest term wins so "SQL Injection" beats "API" when
// both appear.

const GLOSSARY_MATCHERS = GLOSSARY.map((term) => ({
  term,
  re: new RegExp(`(?<![\\w#+])(${esc(term.term)})(?![\\w+#])`, "i"),
})).sort((a, b) => b.term.term.length - a.term.term.length);

function findGlossaryTerm(text: string): GlossaryTerm | undefined {
  const questionish =
    /\b(apa itu|apa sih|maksud dari|maksudnya|jelaskan|explain|what is|what's|define|definition|istilah)\b/i.test(
      text,
    ) || /\?\s*$/.test(text);
  if (!questionish) return undefined;
  for (const { term, re } of GLOSSARY_MATCHERS) {
    if (re.test(text)) return term;
  }
  return undefined;
}

function glossaryReply(term: GlossaryTerm, rl: ChatLang): ChatResponse {
  const related = (term.relatedTerms ?? [])
    .map((s) => GLOSSARY.find((g) => g.slug === s))
    .filter((g): g is GlossaryTerm => !!g);
  const tools = (term.relatedTools ?? [])
    .map((slug) => getCatalog().bySlug.get(slug))
    .filter((t): t is ToolWithMeta => !!t && t.status !== "deprecated")
    .slice(0, 4)
    .map(toToolRef);
  const reply = [
    `**${term.term}** — ${term.short}`,
    term.definition,
    ...(term.example ? [`Contoh: \`${term.example}\``] : []),
    rl === "id"
      ? "Definisi lengkap ada di glossary — cek tautan di bawah. 👇"
      : "The full entry lives in the glossary — see the link below. 👇",
  ].join("\n\n");
  return {
    intent: "glossary",
    responseLang: rl,
    reply,
    tools,
    chips: [
      ...related.slice(0, 2).map((g) => (rl === "id" ? `Apa itu ${g.term}?` : `What is ${g.term}?`)),
      ...(tools.length > 0
        ? [rl === "id" ? "Rekomendasi tools" : "Recommend me tools"]
        : []),
    ],
    links: [{ label: `Buka di glossary: ${term.term}`, href: `/glossary/${term.slug}` }],
  };
}

// ── Main entry ──────────────────────────────────────────────────────────

export function respond(message: string, history: ChatHistoryTurn[] = []): ChatResponse {
  const text = message.trim().slice(0, 1000);
  if (!text) return greetingReply("id");

  const rl = detectResponseLang(text);
  const langs = detectLangs(text);
  const careers = detectCareers(text);
  const topCareer = (careers[0]?.score ?? 0) >= 2 ? careers[0].career : undefined;

  // Context carry: follow-ups like "yang gratis aja dong" inherit language,
  // career, and topic from earlier turns. Current-message detection always
  // wins when it finds something.
  const carried = carryFromHistory(history);
  const effectiveLangs = langs.length > 0 ? langs : carried.langs.slice(0, 2);
  const carriedCareer = careers.length === 0 ? carried.career : null;
  // A "bare" follow-up adds no new subject — search with the carried topic.
  const bare = !topicish(text) && langs.length === 0 && !topCareer;
  const topicQuery = bare && carried.topic ? carried.topic : text;

  const wantsCareer = RE.career.test(text);
  const wantsLangInfo = RE.langinfo.test(text) || RE.learn.test(text);

  // An explicit tool request outranks the thanks/help short-circuits:
  // "makasih, rekomendasi tools foto dong" is a request, not gratitude.
  const hasToolAsk =
    RE.recommend.test(text) || RE.stack.test(text) || /\b(tool|tools|app|aplikasi|software)\b/i.test(text);
  if (RE.greeting.test(text)) return greetingReply(rl);
  if (RE.thanks.test(text) && text.length < 60 && !hasToolAsk) return thanksReply(rl);
  // "cara pakai docker" is about Docker, not about my capabilities — only
  // answer generically when there's no concrete topic attached.
  if (RE.help.test(text) && !hasToolAsk && !topicish(text)) return helpReply(rl);

  const careerWords =
    /\b(profesi|karir|karier|career|pekerjaan|jobs?|jurusan|minat|cocok|jadi|menjadi|become|suited|sesuai)\b/i.test(
      text,
    );

  // 1) Stack intent (before career deep-dive: "stack untuk aplikasi mobile"
  //    mentions "mobile", but that's a domain — not a profession question)
  if (RE.stack.test(text) && !careerWords) return stackReply(text, effectiveLangs, rl);

  // 2) A specific career is named → deep-dive (blends with language context)
  if (topCareer) return careerReply(topCareer, effectiveLangs, rl);

  // 3) Career intent with a known language → rank careers for that language
  if (wantsCareer && effectiveLangs.length > 0) return careersForLangReply(effectiveLangs, rl);

  // 4) Career intent without a language → career map
  if (wantsCareer) return careerListReply(rl);

  // 5) Language info / a message that is basically just language name(s).
  //    Gated on `langs` (this message) so carried context doesn't turn a
  //    follow-up like "rekomendasi tools dong" into a dictionary lookup.
  //    An explicit recommend request ("rekomendasi tools zig") still wins.
  if (
    effectiveLangs.length > 0 &&
    !RE.recommend.test(text) &&
    (wantsLangInfo || (langs.length > 0 && isMostlyLangs(text, langs)))
  ) {
    const lang = langBySlug(effectiveLangs[0]);
    if (lang) return languageReply(lang, rl);
  }

  // 5.5) Glossary lookup — "apa itu ORM", "what is SSR". After the language
  //    dictionary (languages have their own deeper profiles) and before the
  //    tool recommender, which would otherwise turn a definition question
  //    into a search.
  if (!RE.recommend.test(text) && !RE.career.test(text)) {
    const term = findGlossaryTerm(text);
    if (term) return glossaryReply(term, rl);
  }

  // 6) Tool recommendation (with language/career personalization)
  const wantsFree = /\b(gratis|gratisan|free|tanpa bayar)\b/i.test(text);
  if (RE.recommend.test(text) || RE.stack.test(text) || wantsFree || topicish(text)) {
    return recommendReply(text, topicQuery, effectiveLangs, carriedCareer, rl);
  }

  // 7) Fallback
  return fallbackReply(text, topicQuery, rl);
}

/** True when, after removing filler and the detected language names, the
 *  message has nothing (or almost nothing) left — e.g. "python", "aku suka
 *  python". Those are dictionary lookups, not tool searches. */
function isMostlyLangs(text: string, langs: string[]): boolean {
  let t = text;
  for (const slug of langs) {
    const lang = langBySlug(slug);
    if (!lang) continue;
    t = t.replace(new RegExp(`(?<![\\w#+])(${lang.aliases.map(esc).join("|")})(?![\\w#+])`, "gi"), " ");
  }
  t = extractTopic(t);
  return t.replace(/\W/g, "").length <= 2;
}

/** Messages that look like a tool/topic search even without intent words. */
function topicish(text: string): boolean {
  const t = extractTopic(text);
  return t.length >= 3;
}
