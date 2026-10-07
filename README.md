# AllTools — The Developer Dictionary

> **Everything Developers Need, In One Place.**
> Search thousands of developer tools, resources, services, documentation and AI tools.

AllTools is **not** a collection of re-implemented utilities. It is a
**discovery engine and directory**: it collects, categorizes, and points
developers to the best existing tools on the internet, with one search.

- **788 curated tools** across **27 categories** (114 subcategories) — every entry has a real,
  official URL.
- **Search-first**: fuzzy matching, typo tolerance, synonyms, tag/category
  matching, and task-based natural-language queries ("test REST API",
  "convert JSON to TypeScript", "inspect PostgreSQL"). Reachable everywhere
  via the navbar search button or **Ctrl/Cmd+K** command palette.
- **Trending Open Source** section on the homepage, ranked by real GitHub stars.
- **Popularity pipeline**: outbound clicks on "Open Website" are tracked per tool (all-time + a lazy 7-day bucket) and power the homepage **Popular on AllTools** section plus a **Popular** sort on /tools and /search. Hidden until real click data exists — never faked.
- **Stack Explorer** — pick your stack (Next.js, Laravel, Flutter…) and get a
  personalized toolbox grouped by workflow stage.
- **Curated Collections** (`/collections`) — starter packs ("Frontend Starter
  Pack", "AI & LLM Toolkit"…) drawn entirely from the catalog.
- **Tag browser** (`/tags`) — every catalog tag with live counts.
- **Developer Glossary** (`/glossary`) — plain-English definitions of the
  terms developers keep meeting (REST, ORM, ACID, SSR, XSS, …), each with
  related terms and links into the catalog. DevDict AI answers definition
  questions ("apa itu ORM") from the same dataset.
- **Install commands** — official one-liners (`npx create-next-app@latest`,
  `brew install gh`, …) on tool detail pages with a copy button, stored in
  `src/data/install-commands.ts` and validated against the catalog.
- **What's New** (`/whats-new`) — the newest catalog additions.
- **Search analytics** — anonymous query log (no IPs, no sessions) powering
  trending-search chips on /search and a "top queries + zero-result queries"
  section in the admin dashboard: the cheapest curation roadmap there is.
- **Compare tray** — a floating pill shows your current compare selection on
  every page (hidden on /compare itself).
- **PWA** — installable (`manifest.webmanifest`, icons, shortcuts) with a
  conservative service worker: network-first pages with an offline notice,
  cache-first for content-hashed static assets. `/admin` and `/api` bypass it.
- **Favorites export/import** — move your locally-stored shortlist between
  browsers as JSON, no account.
- **Tool detail pages** (`/tools/[slug]`) with use cases, alternatives,
  related tools, platforms, pricing, docs and GitHub links, real GitHub
  stars/license (fetched by `scripts/fetch-github-stats.mjs`), a
  "Report an issue" affordance (broken link / edit suggestion) that lands in
  the admin queue, and dynamic per-tool OpenGraph images.
- **Your shortlist** (`/favorites`) and **recently viewed** — saved locally,
  no account. **Compare** (`/compare`) — up to 4 tools side by side.
- **RSS feed** at `/feed.xml` for the newest catalog entries.
- **Submission system** (`/submit`) with moderator approval, honeypot +
  rate limiting + duplicate-URL detection.
- **Admin CMS** (`/admin`) for CRUD, featuring, reviewing submissions and
  community reports. Login fails closed without `ADMIN_TOKEN` — there is no
  default token.
- **Automated link health checker** that verifies every URL and flags broken
  ones as `needs_review` (never auto-deletes). Works against local SQLite
  *and* Turso; runnable via CI or the bundled Vercel Cron endpoint.
- **SEO**: per-tool metadata + dynamic OG images, OpenGraph, JSON-LD
  (SoftwareApplication + BreadcrumbList), `sitemap.xml`, `robots.txt`,
  canonical URLs; `/search` query pages are noindexed.
- Dark + light mode (follows OS preference until you pick), SSR/ISR
  rendering, instant search with debounced autocomplete.

## Tech Stack

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript         |
| Styling    | Tailwind CSS v4, custom design tokens, dark/light mode  |
| Database   | SQLite via **Drizzle ORM** + better-sqlite3             |
| Search     | In-app scoring engine (fuzzy + synonyms + intents)      |
| Icons      | lucide-react                                            |
| Validation | zod                                                     |

> The search engine runs in-process over the full catalog (fast at this
> scale, no external service needed). It is designed to be swappable with
> Meilisearch/Typesense/Postgres FTS later — see `src/lib/search.ts`.

## Getting Started

```bash
npm install

# create tables + seed the curated dataset # (656 tools)
npm run db:push
npm run db:seed            # add -- --reset to wipe & reseed

# development
npm run dev

# production
npm run build
npm run start              # PORT=3100 npm run start to choose a port
```

Open http://localhost:3000 (or your chosen port).

### Environment variables

| Variable               | Default                 | Purpose                          |
| ---------------------- | ----------------------- | -------------------------------- |
| `ALLTOOLS_DB`          | `./data/alltools.db`    | SQLite database location (local) |
| `ALLTOOLS_DB_URL`      | —                       | Remote libSQL/Turso URL (`libsql://…`) — enables persistent reads/writes |
| `ALLTOOLS_DB_AUTH_TOKEN` | —                     | Auth token for the remote database |
| `ALLTOOLS_DB_DRIVER`   | auto                    | Force `libsql` driver against a local file (testing) |
| `ADMIN_TOKEN`          | — (login disabled)      | Token for `/admin` login. **Required in production** — there is no default |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URLs, sitemap, OpenGraph |
| `CRON_SECRET`          | —                       | Bearer token protecting `/api/cron/check-links` (Vercel Cron) |
| `GITHUB_TOKEN`         | —                       | GitHub API token for `scripts/fetch-github-stats.mjs` |
| `LLM_API_KEY` / `OPENAI_API_KEY` | —             | Optional: enables LLM-polished DevDict replies (OpenAI-compatible); without it the rule-based engine answers |
| `LLM_BASE_URL`         | `https://api.openai.com/v1` | Optional LLM endpoint override |
| `LLM_MODEL`            | `gpt-4o-mini`           | Optional LLM model override |

> Set a strong `ADMIN_TOKEN` before deploying. The admin dashboard is
> noindex and excluded from `robots.txt`, and login fails closed when the
> variable is missing.

## URL Structure

```
/                        Homepage (hero search, popular tools, categories,
                         utilities, AI tools, collections, stacks, latest)
/search                  Search + filters (category, subcategory, pricing,
                         platform, tags, languages, frameworks, open source,
                         self-hosted, docs, github) + sort — noindexed
/tools                   All tools, filterable + sortable
/tools/[slug]            Tool detail page (report issue, save, compare)
/categories              All categories
/categories/[slug]       Category page (subcategory chips, paginated)
/collections             Curated starter-pack collections
/collections/[slug]      One collection
/tags                    Browse the catalog by tag
/stacks                  Stack Explorer (presets + custom builder)
/stacks/[slug]           Preset stack toolbox
/stacks/custom?stacks=a,b  Custom stack toolbox
/favorites               Your locally-saved shortlist + recently viewed
/compare                 Compare up to 4 tools side by side
/submit                  Submit a tool (pending review)
/glossary                Developer glossary (terms in plain English)
/glossary/[slug]         One term (DefinedTerm JSON-LD)
/whats-new               Newest catalog additions
/about                   About & data policy
/admin                   Admin dashboard (token login)
/api/search?q=           JSON autocomplete endpoint
/api/chat                DevDict AI endpoint (rate limited)
/api/tools/bulk?slugs=   Minimal tool info for client pages
/api/feedback            Report broken link / suggest edit
/api/track-click         Outbound click counter
/api/cron/check-links    Vercel Cron incremental link check (Bearer CRON_SECRET)
/feed.xml                RSS feed of newest tools
/sitemap.xml /robots.txt
```

## Data Validation

```bash
npm run validate   # fail loudly on broken references
```

`scripts/validate-data.ts` checks that collections, alternatives/related
slugs, install-command keys and glossary references all resolve, that URLs
and slugs are unique (normalized), and prints coverage stats. It runs in CI
(`.github/workflows/validate-data.yml`) so a renamed tool can never
silently drop cards at render time again.

## Link Health Checker

```bash
npm run check-links                    # check all tools
npm run check-links -- --only-unchecked  # skip URLs verified in the last 7 days
npm run check-links -- --limit 50        # check a batch (works against Turso too)
```

The script (in `scripts/check-links.mjs`) runs against the **local SQLite
file or remote Turso** (set `ALLTOOLS_DB_URL` + `ALLTOOLS_DB_AUTH_TOKEN`).
It does HEAD-then-GET requests with a 12s timeout at concurrency 6, records
`http_status`, `response_time_ms` and errors into `link_checks`, and then:

- 2xx/3xx → `verified = true`, `lastVerifiedAt = now`
- **404 / 410 / DNS errors → `status = 'needs_review'`** (visible in the admin
  dashboard; never auto-deleted)
- 429 / 5xx / timeouts → recorded as transient; `verified` and `status` are
  **left untouched** so healthy badges never flip off

Keep it running two ways:

1. **Vercel Cron** (`vercel.json`) hits `/api/cron/check-links?batch=40`
   daily — set `CRON_SECRET` in Vercel env. Each run checks the
   least-recently-verified tools first.
2. **GitHub Actions** (`.github/workflows/check-links.yml`) runs a full
   `--only-unchecked` sweep weekly against Turso — add
   `ALLTOOLS_DB_URL` / `ALLTOOLS_DB_AUTH_TOKEN` as repo secrets.

Run it once after the initial seed to mark every URL as verified.

## GitHub Stats Enrichment

```bash
GITHUB_TOKEN=… node scripts/fetch-github-stats.mjs        # missing repos only
GITHUB_TOKEN=… node scripts/fetch-github-stats.mjs -- --all  # refresh everything
```

Fetches stars / last-push / license for tools with a GitHub URL via the
GitHub API, writes them into the `tools` table and mirrors a snapshot to
`data/github-stats.json` (committed, merged at seed time). Schedule it in
CI (monthly is plenty) to keep stars fresh — `.github/workflows/
github-stats.yml` runs `--all` against Turso on the 1st of every month
(set the `GH_STATS_TOKEN` repo secret).

## Popularity Pipeline

1. Visitors click **Open Website** → `POST /api/track-click` (rate limited,
   slug-validated) upserts `tool_clicks`: `clicks` (all-time) and
   `weeklyClicks` (lazy 7-day bucket — the endpoint resets it whenever
   `week_start` ages past 7 days, so no cron is needed).
2. The catalog builder merges the counters into every tool
   (`clicks`, `weeklyClicks`), including the bundled cold-start JSON
   (export-catalog LEFT JOINs `tool_clicks`).
3. Consumers: homepage **Popular on AllTools** (weekly-first ranking,
   hidden below 4 tools with clicks), **Trending Open Source** (ranked by
   real GitHub stars), and `?sort=popular` on /tools and /search.
4. Optional monthly GitHub-stars refresh via CI keeps the star ranking
   current (see GitHub Stats Enrichment above).

Admin dashboard → "Most opened tools" shows the raw ranking for operators.

## Data Model (Drizzle, `src/db/schema.ts`)

- `categories` / `subcategories` — taxonomy (icon, homepage order)
- `tools` — the Tool entity: name, slug, url, description, logo, install
  command, category,
  subcategory, tags, pricing, openSource, selfHosted, githubUrl,
  documentationUrl, platforms, languages, frameworks, useCases,
  alternatives, relatedTools, status, verified, lastVerifiedAt, popularity,
  featured, createdAt, updatedAt
- `tags` — normalized tag list (derived from tool tags at seed time)
- `submissions` — community submissions (`pending | approved | rejected`)
- `linkChecks` — one health-check row per run per tool
- `searchQueries` — anonymous search log (query + result count + timestamp);
  powers trending searches and the admin zero-results report

**v1 note:** `tags`, `alternatives`, `relatedTools`, `platforms`,
`languages`, `frameworks` and `useCases` are stored as JSON columns and
searched in memory. This keeps the foundation simple and fast; normalizing
them into `ToolTag` / `ToolAlternative` / `ToolRelation` tables is the
planned next step once the dataset outgrows in-memory search.

## Curation Rules (Quality Bar)

- No fake data, no invented statistics. `popularity` is intentionally `null`
  until objective data (e.g. GitHub stars) is wired in.
- No invented URLs, repos or pricing. Pricing is conservative
  (`free | freemium | paid`) and editorial.
- No tool is claimed "best"; the homepage "Popular" section is an editorial
  `featured` flag, not a ranking.
- Submissions start as `pending` and are only published after admin approval.
- Every tool belongs to exactly one category (and optional subcategory).

### Adding tools

Preferred: use **/admin → Add tool** (or /submit then approve). Bulk edits
can be made in `src/data/tools/*.ts` followed by
`npm run db:seed -- --reset` (development only — it wipes tool rows).

## Updating the Production Database

Schema + catalog changes reach Turso in one of two ways:

1. **From your machine** (when you have the credentials):

   ```bash
   ALLTOOLS_DB_URL=… ALLTOOLS_DB_AUTH_TOKEN=… npm run db:push        # schema
   ALLTOOLS_DB_URL=… ALLTOOLS_DB_AUTH_TOKEN=… npm run db:seed -- --reset   # catalog
   ```

2. **From CI** — the **Update Production DB** workflow
   (`.github/workflows/update-db.yml`, `workflow_dispatch`) pushes the
   schema, reseeds the catalog and refreshes the first 400 link badges.
   It requires the `ALLTOOLS_DB_URL` and `ALLTOOLS_DB_AUTH_TOKEN` secrets
   on the GitHub repo (Settings → Secrets and variables → Actions).
   Without them the job silently runs against a throwaway local file.

A reseed wipes tools/categories/tags/link_checks but **preserves**
community submissions, feedback and outbound-click counters. After a
reseed every link is "pending verification" until the checker (Vercel
cron or the CI sweep) re-verifies them.

## Deployment (Vercel)

Live: https://alldevtools.vercel.app

- `vercel-build` script (`scripts/prepare-build.mjs`) pushes the schema, seeds a **local** SQLite file, exports `src/data/catalog.generated.json`, and bundles it into the server code — the build never touches the live database.
- **Production uses Turso (libSQL)**: `ALLTOOLS_DB_URL` + `ALLTOOLS_DB_AUTH_TOKEN` point at `libsql://alltools-eka0789.aws-ap-south-1.turso.io` (Mumbai), so `/submit`, admin CRUD and submission review persist across deploys. Reads fall back to the bundled JSON if the remote DB is unreachable.
- **Catalog freshness**: each serverless instance serves the catalog from memory and refreshes it from the DB in the background at most every 30 s (`CATALOG_TTL_MS` in `src/lib/data.ts`), so approved submissions and admin edits appear on public pages within ~1–2 minutes (ISR `revalidate = 120`) without a redeploy. Admin mutations additionally refresh the catalog synchronously on the instance that ran them.
- Re-seed the remote database after changing the seed data: `ALLTOOLS_DB_URL=… ALLTOOLS_DB_AUTH_TOKEN=… npm run db:seed -- --reset` — wipes and reseeds the catalog tables (community submissions are preserved).
- Environment vars on Vercel: `ADMIN_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `ALLTOOLS_DB_URL`, `ALLTOOLS_DB_AUTH_TOKEN`.

## Project Layout

```
src/
  app/               routes (home, search, tools, categories, stacks,
                     submit, about, admin, api, sitemap, robots)
  components/        navbar, footer, search-box, tool-card, filters, …
  data/              seed taxonomy + curated tool dataset (5 group files)
  db/                drizzle schema, client, seed script
  lib/               data layer, search engine, stacks, admin, utils
scripts/check-links.mjs  link health checker
```
