# AllTools — The Developer Dictionary

> **Everything Developers Need, In One Place.**
> Search thousands of developer tools, resources, services, documentation and AI tools.

AllTools is **not** a collection of re-implemented utilities. It is a
**discovery engine and directory**: it collects, categorizes, and points
developers to the best existing tools on the internet, with one search.

- **656 curated tools** across **26 categories** — every entry has a real,
  official URL.
- **Search-first**: fuzzy matching, typo tolerance, synonyms, tag/category
  matching, and task-based natural-language queries ("test REST API",
  "convert JSON to TypeScript", "inspect PostgreSQL").
- **Trending Open Source** section on the homepage, built from an editorial `trending` tag on genuinely popular OSS.
- **Stack Explorer** — pick your stack (Next.js, Laravel, Flutter…) and get a
  personalized toolbox grouped by workflow stage.
- **Tool detail pages** (`/tools/[slug]`) with use cases, alternatives,
  related tools, platforms, pricing, docs and GitHub links.
- **Submission system** (`/submit`) with moderator approval.
- **Admin CMS** (`/admin`) for CRUD, featuring, and reviewing submissions.
- **Automated link health checker** that verifies every URL and flags broken
  ones as `needs_review` (never auto-deletes).
- **SEO**: per-tool metadata, OpenGraph, JSON-LD (SoftwareApplication +
  BreadcrumbList), `sitemap.xml`, `robots.txt`, canonical URLs.
- Dark + light mode, SSR/ISR rendering, instant search with debounced
  autocomplete.

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
| `ADMIN_TOKEN`          | `alltools-admin`        | Token for `/admin` login         |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URLs, sitemap, OpenGraph |

> Set a strong `ADMIN_TOKEN` before deploying. The admin dashboard is
> noindex and excluded from `robots.txt`.

## URL Structure

```
/                        Homepage (hero search, popular tools, categories,
                         utilities, AI tools, stacks, recently added)
/search                  Search + filters (category, subcategory, pricing,
                         platform, tags, languages, frameworks, open source,
                         self-hosted, docs, github)
/tools                   All tools, filterable
/tools/[slug]            Tool detail page
/categories              All categories
/categories/[slug]       Category page (with subcategory chips)
/stacks                  Stack Explorer (presets + custom builder)
/stacks/[slug]           Preset stack toolbox
/stacks/custom?stacks=a,b  Custom stack toolbox
/submit                  Submit a tool (pending review)
/about                   About & data policy
/admin                   Admin dashboard (token login)
/api/search?q=           JSON autocomplete endpoint
/sitemap.xml /robots.txt
```

## Link Health Checker

```bash
npm run check-links                    # check all tools
npm run check-links -- --only-unchecked  # skip URLs verified in the last 7 days
```

The script (in `scripts/check-links.mjs`) does HEAD-then-GET requests with a
12s timeout at concurrency 6, records `http_status`, `response_time_ms` and
errors into `link_checks`, and then:

- 2xx/3xx → `verified = true`, `lastVerifiedAt = now`
- **404 / 410 / DNS errors → `status = 'needs_review'`** (visible in the admin
  dashboard; never auto-deleted)
- 429 / 5xx / timeouts → recorded as transient, status unchanged

Schedule it (cron/CI) to keep the directory healthy. Run it once after the
initial seed to mark every URL as verified.

## Data Model (Drizzle, `src/db/schema.ts`)

- `categories` / `subcategories` — taxonomy (icon, homepage order)
- `tools` — the Tool entity: name, slug, url, description, logo, category,
  subcategory, tags, pricing, openSource, selfHosted, githubUrl,
  documentationUrl, platforms, languages, frameworks, useCases,
  alternatives, relatedTools, status, verified, lastVerifiedAt, popularity,
  featured, createdAt, updatedAt
- `tags` — normalized tag list (derived from tool tags at seed time)
- `submissions` — community submissions (`pending | approved | rejected`)
- `linkChecks` — one health-check row per run per tool

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

## Deployment (Vercel)

Live: https://alldevtools.vercel.app

- `vercel-build` script (`scripts/prepare-build.mjs`) pushes the schema, seeds a **local** SQLite file, exports `src/data/catalog.generated.json`, and bundles it into the server code — the build never touches the live database.
- **Production uses Turso (libSQL)**: `ALLTOOLS_DB_URL` + `ALLTOOLS_DB_AUTH_TOKEN` point at `libsql://alltools-eka0789.aws-ap-south-1.turso.io` (Mumbai), so `/submit`, admin CRUD and submission review persist across deploys. Reads fall back to the bundled JSON if the remote DB is unreachable.
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
