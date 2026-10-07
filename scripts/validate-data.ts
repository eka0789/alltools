/**
 * Data integrity validator — run in CI (and locally via `npm run validate`)
 * so broken references fail loudly instead of silently dropping tool cards
 * at render time (collections/alternatives/related) or seeding.
 */
import { ALL_SEED_TOOLS } from "../src/data/tools";
import { CATEGORIES } from "../src/data/categories";
import { COLLECTIONS } from "../src/data/collections";
import { INSTALL_COMMANDS } from "../src/data/install-commands";
import { GLOSSARY } from "../src/data/glossary";
import { EDITORIAL } from "../src/data/editorial";
import { slugify } from "../src/lib/slug";

let errors = 0;
let warnings = 0;
const fail = (msg: string) => {
  console.error(`  ✗ ${msg}`);
  errors += 1;
};
const warn = (msg: string) => {
  console.warn(`  ⚠ ${msg}`);
  warnings += 1;
};

const slugOf = (t: { n: string; slug?: string }) => t.slug ?? slugify(t.n);

// ── Slugs & URLs ─────────────────────────────────────────────────────────
const bySlug = new Map<string, { n: string; u: string }>();
const urlNorm = (u: string) => {
  try {
    const parsed = new URL(u.trim().replace(/\/+$/, ""));
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}${parsed.search}`;
  } catch {
    return u.toLowerCase();
  }
};
const byUrl = new Map<string, string>();

console.log("Validating seed data…");

for (const t of ALL_SEED_TOOLS) {
  const slug = slugOf(t);
  if (bySlug.has(slug)) fail(`duplicate tool slug "${slug}" (${bySlug.get(slug)!.n} vs ${t.n})`);
  bySlug.set(slug, { n: t.n, u: t.u });
  const url = urlNorm(t.u);
  if (byUrl.has(url)) fail(`duplicate URL ${t.u} (${byUrl.get(url)} vs ${t.n})`);
  byUrl.set(url, t.n);
}

// ── Category / subcategory references ────────────────────────────────────
const catSlugs = new Set(CATEGORIES.map((c) => c.slug));
const subPairs = new Set(CATEGORIES.flatMap((c) => (c.subs ?? []).map((s) => `${c.slug}/${s.slug}`)));
for (const t of ALL_SEED_TOOLS) {
  if (!catSlugs.has(t.c)) fail(`${t.n}: unknown category "${t.c}"`);
  if (t.s && !subPairs.has(`${t.c}/${t.s}`)) fail(`${t.n}: unknown subcategory "${t.c}/${t.s}"`);
}

// ── Tool-to-tool references (collections, alternatives, related) ────────
let droppedAlt = 0;
let droppedRel = 0;
for (const t of ALL_SEED_TOOLS) {
  for (const alt of t.alt ?? []) {
    if (!bySlug.has(alt)) {
      fail(`${t.n}: alt references unknown slug "${alt}"`);
      droppedAlt += 1;
    }
  }
  for (const rel of t.rel ?? []) {
    if (!bySlug.has(rel)) {
      fail(`${t.n}: rel references unknown slug "${rel}"`);
      droppedRel += 1;
    }
  }
}
if (droppedAlt > 0 || droppedRel > 0) {
  // Seed drops unknown refs with a warning — at validator level they are
  // errors so CI catches them before they render as missing cards.
  fail(`${droppedAlt} alt + ${droppedRel} rel references would be silently dropped at seed time`);
}

for (const c of COLLECTIONS) {
  for (const s of c.tools) {
    if (!bySlug.has(s)) fail(`collection "${c.slug}": unknown tool slug "${s}"`);
  }
  if (new Set(c.tools).size !== c.tools.length) warn(`collection "${c.slug}" has duplicate entries`);
}

// ── Install commands ─────────────────────────────────────────────────────
for (const [slug, cmd] of Object.entries(INSTALL_COMMANDS)) {
  if (!bySlug.has(slug)) fail(`install command key "${slug}" does not match any tool slug`);
  if (typeof cmd !== "string" || cmd.length < 3 || cmd.length > 300) {
    fail(`install command for "${slug}" is malformed`);
  }
}

// ── Editorial pros/cons ──────────────────────────────────────────────────
for (const [slug, entry] of Object.entries(EDITORIAL)) {
  if (!bySlug.has(slug)) fail(`editorial key "${slug}" does not match any tool slug`);
  if (!entry.pros?.length || !entry.cons?.length) {
    fail(`editorial "${slug}" needs at least one pro and one con`);
  }
  if ((entry.pros?.length ?? 0) > 5 || (entry.cons?.length ?? 0) > 5) {
    fail(`editorial "${slug}": max 5 pros / 5 cons`);
  }
}

// ── Glossary ─────────────────────────────────────────────────────────────
const termSlugs = new Set<string>();
for (const term of GLOSSARY) {
  if (termSlugs.has(term.slug)) fail(`duplicate glossary slug "${term.slug}"`);
  termSlugs.add(term.slug);
  if (!term.short || term.short.length > 200) fail(`glossary "${term.slug}": short must be 1–200 chars`);
  if (!term.definition || term.definition.length < 20) fail(`glossary "${term.slug}": definition too short`);
  for (const tool of term.relatedTools ?? []) {
    if (!bySlug.has(tool)) fail(`glossary "${term.slug}": relatedTools references unknown slug "${tool}"`);
  }
}
for (const term of GLOSSARY) {
  for (const rel of term.relatedTerms ?? []) {
    if (!termSlugs.has(rel)) fail(`glossary "${term.slug}": relatedTerms references unknown term "${rel}"`);
  }
}
for (const t of ALL_SEED_TOOLS) {
  if (t.install && INSTALL_COMMANDS[slugOf(t)]) {
    warn(`${t.n}: has both an inline install and an INSTALL_COMMANDS entry (inline wins)`);
  }
}

// ── Coverage report (informational) ──────────────────────────────────────
const pct = (n: number) => `${Math.round((n / ALL_SEED_TOOLS.length) * 100)}%`;
const count = (f: (t: (typeof ALL_SEED_TOOLS)[number]) => boolean) =>
  ALL_SEED_TOOLS.filter(f).length;
console.log(
  `\nCoverage: ${ALL_SEED_TOOLS.length} tools · langs ${pct(count((t) => (t.langs?.length ?? 0) > 0))} · fw ${pct(count((t) => (t.fw?.length ?? 0) > 0))} · alt ${pct(count((t) => (t.alt?.length ?? 0) > 0))} · docs ${pct(count((t) => !!t.docs))} · install ${pct(count((t) => !!t.install || !!INSTALL_COMMANDS[slugOf(t)]))}`,
);
const perCat = new Map<string, number>();
for (const t of ALL_SEED_TOOLS) perCat.set(t.c, (perCat.get(t.c) ?? 0) + 1);
const thin = [...perCat.entries()].filter(([, n]) => n < 10).map(([c, n]) => `${c} (${n})`);
if (thin.length) console.log(`Thin categories (<10 tools): ${thin.join(", ")}`);

if (errors > 0) {
  console.error(`\nValidation failed: ${errors} error(s), ${warnings} warning(s).`);
  process.exit(1);
}
console.log(`\nValidation passed (${warnings} warning(s)).`);
