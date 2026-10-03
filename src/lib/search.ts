import type { ToolWithMeta } from "./data";
import { getCatalog } from "./data";

// ── Normalization & fuzzy helpers ───────────────────────────────────────

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Bounded Levenshtein distance; returns Infinity once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
      if (prev[j] < rowMin) rowMin = prev[j];
    }
    if (rowMin > max) return Infinity;
  }
  return prev[b.length] <= max ? prev[b.length] : Infinity;
}

function fuzzyTolerance(len: number): number {
  return len <= 3 ? 1 : len <= 6 ? 2 : 3;
}

// ── Synonyms ────────────────────────────────────────────────────────────

const SYNONYMS: Record<string, string[]> = {
  jwt: ["json web token", "token", "auth"],
  json: ["data"],
  xml: ["markup"],
  yaml: ["yml"],
  api: ["rest", "http", "graphql", "endpoint"],
  rest: ["api", "http"],
  graphql: ["api"],
  compress: ["minify", "optimize", "shrink", "squeeze", "reducer"],
  minify: ["compress", "minification"],
  beautify: ["format", "pretty", "formatter"],
  format: ["beautify", "pretty", "formatter"],
  gui: ["client", "desktop", "ui", "viewer"],
  client: ["gui", "desktop"],
  cli: ["command line", "terminal"],
  convert: ["transform", "converter", "conversion"],
  converter: ["convert", "transform", "conversion"],
  encode: ["encoder", "encoding"],
  decode: ["decoder", "decoding"],
  encoder: ["encode", "encoding"],
  decoder: ["decode", "decoding"],
  hash: ["digest", "checksum", "md5", "sha", "sha256"],
  password: ["passphrase", "credentials"],
  colors: ["color", "palette", "colour"],
  color: ["colors", "palette", "colour"],
  palette: ["colors", "color"],
  deploy: ["hosting", "deployment", "publish", "paas"],
  hosting: ["deploy", "cloud", "paas", "host"],
  database: ["db", "sql", "nosql"],
  db: ["database"],
  postgres: ["postgresql", "pg"],
  postgresql: ["postgres", "pg"],
  mysql: ["maria", "mariadb"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s", "kubectl"],
  js: ["javascript"],
  javascript: ["js"],
  ts: ["typescript"],
  typescript: ["ts"],
  nodejs: ["node.js", "node"],
  "node.js": ["nodejs", "node"],
  fast: ["performance", "speed"],
  generate: ["generator", "create"],
  generator: ["generate", "create"],
  test: ["testing", "tests", "tester"],
  testing: ["test", "tester"],
  uptime: ["monitoring", "availability", "status"],
  monitoring: ["observability", "metrics", "alerting"],
  docs: ["documentation", "reference", "cheatsheet"],
  documentation: ["docs", "reference"],
  reference: ["documentation", "docs"],
  cheatsheet: ["cheatsheets", "reference"],
  ai: ["llm", "gpt", "ml", "artificial intelligence"],
  llm: ["ai", "model", "gpt"],
  agent: ["ai", "assistant"],
  regex: ["regexp", "regular expressions"],
  regexp: ["regex"],
  diff: ["compare", "comparison"],
  compare: ["diff", "comparison"],
  validate: ["validator", "validation", "check", "lint"],
  validator: ["validate", "validation", "check"],
  lint: ["linter", "linting", "validate"],
  formatter: ["format", "beautify", "pretty"],
  viewer: ["view", "gui", "preview"],
  editor: ["editing", "ide"],
  ide: ["editor", "editing"],
  scraper: ["scraping", "crawl", "crawling"],
  scraping: ["scraper", "crawl"],
  screenshot: ["capture", "snip"],
  image: ["images", "photo", "picture"],
  images: ["image", "photo"],
  pdf: ["document"],
  qr: ["qrcode", "qr-code", "barcode"],
  qrcode: ["qr", "qr-code"],
  git: ["version control", "vcs"],
  docker: ["container", "containers"],
  container: ["docker", "containers"],
  cache: ["caching", "redis"],
  queue: ["queues", "messaging"],
  framework: ["frameworks"],
  orm: ["orms", "database"],
  tunnel: ["tunneling", "ngrok", "localhost"],
  placeholder: ["dummy", "lorem"],
  logo: ["favicon", "icons"],
  favicon: ["logo", "icons"],
  icons: ["icon", "svg"],
  mock: ["mocking", "fake", "stub"],
  mocking: ["mock", "fake", "stub"],
  fake: ["mock", "mocking", "dummy"],
  benchmark: ["performance", "load", "testing"],
  load: ["load-testing", "stress", "performance"],
  accessibility: ["a11y", "wcag"],
  a11y: ["accessibility", "wcag"],
};

// ── Task-based (natural language) intents ───────────────────────────────

interface Intent {
  re: RegExp;
  tags?: string[];
  categories?: string[];
  label: string;
}

const INTENTS: Intent[] = [
  { re: /\b(test|check|debug)\b.*\b(api|rest|endpoint|http)\b|\bapi\b.*\btest/i, tags: ["api", "testing", "rest"], categories: ["api"], label: "API testing" },
  { re: /\bjson\b.*\b(typescript|ts|zod|java|kotlin|golang|python|php|csharp|interface|type)\b|\bconvert\b.*\bjson\b/i, tags: ["json", "converter", "codegen"], categories: ["data-formats"], label: "JSON conversion" },
  { re: /\b(decode|debug|inspect|parse)\b.*\b(jwt|token)\b|\bjwt\b/i, tags: ["jwt", "token", "auth"], categories: ["encoding", "security"], label: "JWT tools" },
  { re: /\b(compress|shrink|optimize|minify)\b.*\b(image|png|jpe?g|webp|svg|photo)\b|\bimage\b.*\bcompress/i, tags: ["compression", "optimizer"], categories: ["media"], label: "Image compression" },
  { re: /\bdeploy\b.*\b(laravel|docker|app|application|site|website|next|node)\b|\bdeploy\b/i, tags: ["hosting", "deploy", "docker", "ci-cd", "paas"], categories: ["cloud", "devops"], label: "Deployment" },
  { re: /\bai\b.*\b(cod(e|ing)|assistant|pair|agent|ide)\b|\bcod(e|ing)\b.*\bai\b/i, tags: ["ai-coding", "ai", "agent"], categories: ["ai"], label: "AI coding tools" },
  { re: /\b(inspect|browse|view|manage|gui|client)\b.*\b(postgres|mysql|database|db|mongo|redis)\b/i, tags: ["gui", "client", "admin"], categories: ["database"], label: "Database clients" },
  { re: /\bformat\b.*\bsql\b|\bsql\b.*\bformat/i, tags: ["sql", "formatter"], categories: ["sql"], label: "SQL formatting" },
  { re: /\b(generate|create|random)\b.*\b(password|uuid|guid|secret)\b/i, tags: ["generator", "passwords", "uuid"], categories: ["security"], label: "Generators" },
  { re: /\b(scan|check|audit|find)\b.*\b(security|vulnerab|secret|leak|ssl|tls)\b/i, tags: ["scanning", "audit", "ssl", "security"], categories: ["security"], label: "Security scanning" },
  { re: /\b(fake|mock|stub)\b.*\b(api|backend|server|data|rest)\b/i, tags: ["mocking", "fake-api", "fake-data"], categories: ["api", "testing"], label: "Mocking" },
  { re: /\b(learn|practice|exercise)\b.*\b(sql|regex|git|javascript|python|typing)\b/i, tags: ["learning", "practice", "interactive", "tutorial"], label: "Learning & practice" },
  { re: /\bmarkdown\b.*\b(pdf|html|docx|word)\b|\bconvert\b.*\bmarkdown\b/i, tags: ["markdown", "converter"], categories: ["documents"], label: "Markdown conversion" },
  { re: /\bcheats? ?sheet\b|\bquick reference\b/i, tags: ["cheatsheet", "reference"], categories: ["docs"], label: "Cheatsheets" },
  { re: /\bdocker\b.*\b(compose|container|image)\b|\bcontainerize\b/i, tags: ["docker", "containers"], categories: ["devops"], label: "Docker tooling" },
  { re: /\b(screenshot|capture)\b.*\b(screen|page|website)\b/i, tags: ["screenshot", "capture"], categories: ["media"], label: "Screenshots" },
  { re: /\bmerge\b.*\bpdf\b|\bpdf\b.*\b(merge|split|compress|convert)\b/i, tags: ["pdf"], categories: ["documents"], label: "PDF tools" },
  { re: /\b(column|grid|layout|flexbox)\b.*\bcss\b|\bcss\b.*\b(grid|flexbox|generator|gradient)\b/i, tags: ["css", "generator", "layout"], categories: ["css"], label: "CSS tools" },
  { re: /\b(color|colour)\b.*\b(palette|contrast|generator|blind)\b/i, tags: ["palette", "contrast", "colors"], categories: ["color"], label: "Color tools" },
  { re: /\bvector\b.*\b(database|db|search|store)\b|\bembedding(s)?\b.*\b(store|db|database)\b/i, tags: ["vector", "embeddings"], categories: ["ai"], label: "Vector databases" },
  { re: /\b(run|host)\b.*\b(llm|model|ai)\b.*\blocal(ly)?\b|\blocal\b.*\bllm\b/i, tags: ["local", "llm", "inference"], categories: ["ai"], label: "Local AI" },
  { re: /\b(error|exception|crash)\b.*\b(track|monitor|report)/i, tags: ["errors", "monitoring"], categories: ["monitoring"], label: "Error tracking" },
  { re: /\bcron\b|\bschedule(d)?\b.*\b(job|task)\b/i, tags: ["cron", "scheduler"], label: "Cron & scheduling" },
  { re: /\b(browser)\b.*\b(support|compatib)/i, tags: ["browser-support", "compatibility"], categories: ["css"], label: "Browser compatibility" },
];

// ── Tool index ──────────────────────────────────────────────────────────

interface IndexedTool {
  tool: ToolWithMeta;
  nameLower: string;
  nameSlug: string;
  nameWords: string[];
  tokenSet: Set<string>; // tags, languages, frameworks, platforms
  blob: string; // description + useCases, lowercased
}

let indexCache: IndexedTool[] | null = null;

function buildIndex(): IndexedTool[] {
  if (indexCache) return indexCache;
  const catalog = getCatalog();
  indexCache = catalog.tools.map((tool) => {
    const nameLower = normalize(tool.name);
    const nameSlug = tool.slug;
    return {
      tool,
      nameLower,
      nameSlug,
      nameWords: nameLower.split(/[^a-z0-9.+#]+/).filter(Boolean),
      tokenSet: new Set(
        [
          ...tool.tags,
          ...tool.languages,
          ...tool.frameworks,
          ...tool.platforms,
          tool.categorySlug,
          tool.subcategorySlug ?? "",
        ]
          .filter(Boolean)
          .map((t) => normalize(t)),
      ),
      blob: normalize(
        [tool.description, ...tool.useCases, tool.categoryName].join(" "),
      ),
    };
  });
  return indexCache;
}

export function invalidateSearchIndex() {
  indexCache = null;
}

// ── Filters ─────────────────────────────────────────────────────────────

export interface SearchFilters {
  category?: string;
  sub?: string;
  pricing?: string;
  platform?: string;
  tag?: string;
  lang?: string;
  framework?: string;
  oss?: boolean;
  selfhosted?: boolean;
  docs?: boolean;
  github?: boolean;
  free?: boolean;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const one = (k: string): string | undefined => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : undefined;
  };
  const flag = (k: string): boolean | undefined => {
    const v = one(k);
    return v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined;
  };
  return {
    category: one("category"),
    sub: one("sub"),
    pricing: one("pricing"),
    platform: one("platform"),
    tag: one("tag"),
    lang: one("lang"),
    framework: one("framework"),
    oss: flag("oss"),
    selfhosted: flag("selfhosted"),
    docs: flag("docs"),
    github: flag("github"),
    free: flag("free"),
  };
}

function passesFilters(item: IndexedTool, f: SearchFilters): boolean {
  const t = item.tool;
  // deprecated entries are hidden; needs_review stays discoverable until a
  // human confirms (a flag alone must not erase a tool from the directory)
  if (t.status === "deprecated") return false;
  if (f.category && t.categorySlug !== f.category) return false;
  if (f.sub && t.subcategorySlug !== f.sub) return false;
  if (f.pricing && t.pricing !== f.pricing) return false;
  if (f.platform && !t.platforms.includes(f.platform)) return false;
  if (f.tag && !t.tags.some((x) => normalize(x) === normalize(f.tag!))) return false;
  if (f.lang && !t.languages.some((x) => normalize(x) === normalize(f.lang!))) return false;
  if (f.framework && !t.frameworks.some((x) => normalize(x) === normalize(f.framework!))) return false;
  if (f.oss && !t.openSource) return false;
  if (f.selfhosted && !t.selfHosted) return false;
  if (f.docs && !t.documentationUrl) return false;
  if (f.github && !t.githubUrl) return false;
  if (f.free && !(t.pricing === "free" || t.openSource)) return false;
  return true;
}

// ── Scoring ─────────────────────────────────────────────────────────────

function scoreToken(item: IndexedTool, qt: string): number {
  let s = 0;
  const { nameLower, nameSlug, nameWords, tokenSet, blob } = item;

  if (nameLower === qt) s = Math.max(s, 130);
  if (nameSlug === qt) s = Math.max(s, 120);
  if (nameLower.startsWith(qt)) s = Math.max(s, 95);
  if (nameSlug.startsWith(qt)) s = Math.max(s, 85);
  if (nameWords.some((w) => w.startsWith(qt))) s = Math.max(s, 80);
  if (nameLower.includes(qt)) s = Math.max(s, 65);

  if (tokenSet.has(qt)) s = Math.max(s, 60);
  for (const tok of tokenSet) {
    if (tok.startsWith(qt)) {
      s = Math.max(s, 45);
      break;
    }
  }
  for (const tok of tokenSet) {
    if (tok.includes(qt)) {
      s = Math.max(s, 32);
      break;
    }
  }

  const syns = SYNONYMS[qt];
  if (syns) {
    for (const syn of syns) {
      const synSlug = normalize(syn).replace(/\s+/g, "-");
      if (tokenSet.has(synSlug) || tokenSet.has(normalize(syn))) {
        s = Math.max(s, 35);
        break;
      }
      if (nameLower.includes(syn) || blob.includes(syn)) {
        s = Math.max(s, 25);
        break;
      }
    }
  }

  if (blob.includes(qt)) s = Math.max(s, 18);

  if (s === 0) {
    // typo tolerance on strong fields only
    const tol = fuzzyTolerance(qt.length);
    if (editDistance(nameLower, qt, tol) <= tol) s = 48;
    else if (editDistance(nameSlug, qt, tol) <= tol) s = 42;
    else if (nameWords.some((w) => editDistance(w, qt, tol) <= tol)) s = 38;
    else {
      for (const tok of tokenSet) {
        if (editDistance(tok, qt, tol) <= tol) {
          s = 30;
          break;
        }
      }
    }
  }
  return s;
}

export interface SearchOptions {
  q?: string;
  filters?: SearchFilters;
  page?: number;
  perPage?: number;
  sort?: "relevance" | "name" | "newest";
  // Skip facet computation (chat-originated lookups never render them).
  facets?: boolean;
}

export interface SearchResult {
  items: ToolWithMeta[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  facets: {
    categories: { slug: string; name: string; count: number }[];
    pricing: { key: string; count: number }[];
  };
}

export function searchTools(opts: SearchOptions): SearchResult {
  const index = buildIndex();
  const filters = opts.filters ?? {};
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 24));
  const q = normalize(opts.q ?? "");

  const activeIntents = q
    ? INTENTS.filter((intent) => intent.re.test(opts.q ?? ""))
    : [];
  const intentTags = new Set(activeIntents.flatMap((i) => i.tags ?? []));
  const intentCats = new Set(activeIntents.flatMap((i) => i.categories ?? []));

  let qMatched: IndexedTool[];
  if (!q) {
    qMatched = index;
  } else {
    const qTokens = q.split(/\s+/).filter(Boolean);
    const scored: { item: IndexedTool; score: number }[] = [];
    for (const item of index) {
      let score = 0;
      let miss = 0;
      for (const qt of qTokens) {
        const s = scoreToken(item, qt);
        if (s === 0) miss += 1;
        else score += s;
      }
      if (miss === qTokens.length) continue;
      if (miss > 0) score -= 12 * miss;

      if (item.nameLower.includes(q)) score += 30;
      if (qTokens.length > 1 && qTokens.every((t) => item.blob.includes(t)))
        score += 8;

      if (intentTags.size > 0) {
        let hits = 0;
        for (const tg of item.tool.tags) {
          if (intentTags.has(normalize(tg))) hits += 1;
        }
        if (hits > 0) score += 28 + 6 * Math.min(hits, 4);
      }
      if (intentCats.has(item.tool.categorySlug)) score += 12;

      if (item.tool.featured) score += 3;
      if (score >= 15) scored.push({ item, score });
    }
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        a.item.nameLower.length - b.item.nameLower.length ||
        a.item.nameLower.localeCompare(b.item.nameLower),
    );
    qMatched = scored.map((s) => s.item);
  }

  let pool: IndexedTool[] = qMatched.filter((item) => passesFilters(item, filters));

  const sort = opts.sort ?? (q ? "relevance" : "name");
  if (sort === "name") {
    pool = pool
      .slice()
      .sort(
        (a, b) =>
          Number(b.tool.featured) - Number(a.tool.featured) ||
          a.nameLower.localeCompare(b.nameLower),
      );
  } else if (sort === "newest") {
    pool = pool.slice().sort((a, b) => b.tool.createdAt - a.tool.createdAt);
  }

  // Facets: counts computed on the q-matched pool (so they reflect what the
  // query actually found) ignoring the facet's own filter.
  const rest = { ...filters } as Partial<SearchFilters>;
  delete rest.category;
  const catCounts = new Map<string, { name: string; count: number }>();
  const pricingCounts = new Map<string, number>();
  if (opts.facets !== false) {
    for (const item of qMatched) {
      const t = item.tool;
      if (passesFilters(item, { ...rest, category: undefined })) {
        const cur = catCounts.get(t.categorySlug) ?? { name: t.categoryName, count: 0 };
        cur.count += 1;
        catCounts.set(t.categorySlug, cur);
      }
      if (passesFilters(item, { ...rest, pricing: undefined })) {
        pricingCounts.set(t.pricing, (pricingCounts.get(t.pricing) ?? 0) + 1);
      }
    }
  }

  const total = pool.length;
  const start = (page - 1) * perPage;
  const items = pool.slice(start, start + perPage).map((s) => s.tool);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    facets: {
      categories: [...catCounts.entries()]
        .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
      pricing: ["free", "freemium", "paid"].map((key) => ({
        key,
        count: pricingCounts.get(key) ?? 0,
      })),
    },
  };
}

/** Lightweight results for the search dropdown API. */
export function quickSearch(q: string, limit = 8): ToolWithMeta[] {
  return searchTools({ q, perPage: limit }).items;
}
