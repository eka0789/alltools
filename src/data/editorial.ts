// Editorial decision aid for the most-visited catalog tools: honest
// strengths and trade-offs, shown on tool detail pages as "Strengths &
// trade-offs". Written to help a developer DECIDE, not to market — every
// entry states when the tool is the wrong choice. Slugs are validated by
// `npm run validate`; seed merges these into the tools table.

export interface EditorialEntry {
  pros: string[];
  cons: string[];
}

export const EDITORIAL: Record<string, EditorialEntry> = {
  // ── Frameworks & languages ────────────────────────────────────────────
  "next-js": {
    pros: [
      "Full-stack in one repo: routing, SSR/ISR, API routes and image optimization included",
      "Huge ecosystem and hiring pool; Vercel deploys are near-zero-config",
      "App Router + React Server Components cut client JavaScript dramatically",
    ],
    cons: [
      "App Router caching rules have a steep learning curve and changed repeatedly across versions",
      "Vercel-centric defaults can feel awkward on self-hosted or non-Vercel platforms",
      "Build times grow quickly on very large apps",
    ],
  },
  react: {
    pros: [
      "Largest component ecosystem and community of any UI library",
      "Mental model is stable — skills transfer across React 16→19 and meta-frameworks",
      "Server Components and Suspense push rendering closer to the server",
    ],
    cons: [
      "Bare React leaves routing, data-fetching and styling decisions entirely to you",
      "Re-render performance requires discipline (memo, keys, context scoping)",
      "The ecosystem churn (state/data libraries) adds decision fatigue",
    ],
  },
  vue: {
    pros: [
      "Gentle learning curve with excellent official docs in multiple languages",
      "Scales from drop-in widget to full SPA with the same API",
      "Single-file components keep template, logic and styling together",
    ],
    cons: [
      "Smaller job market and ecosystem than React",
      "Options/Composition API duality splits tutorials and codebases",
    ],
  },
  angular: {
    pros: [
      "Batteries-included: router, forms, HTTP, DI and testing in one opinionated package",
      "TypeScript-first with strong typing all the way to templates",
      "Long-term support cadence suits enterprise teams",
    ],
    cons: [
      "Heaviest learning curve of the major frameworks (DI, RxJS, decorators)",
      "Verbose for small apps; bundle overhead without careful lazy loading",
    ],
  },
  svelte: {
    pros: [
      "Compiles away the framework — tiny bundles and true reactivity without a VDOM",
      "Runes and stores make state management feel native to the language",
      "Consistently highest 'enjoyment' scores in developer surveys",
    ],
    cons: [
      "Smaller ecosystem — fewer ready-made component libraries than React",
      "Svelte 4→5 runes migration broke some third-party components",
    ],
  },
  astro: {
    pros: [
      "Ships zero JS by default — islands hydrate only what needs interactivity",
      "Framework-agnostic islands (React, Vue, Svelte in one project)",
      "Content collections make blogs and docs excellent out of the box",
    ],
    cons: [
      "Not built for highly interactive, app-like SPAs",
      "Island architecture adds mental overhead when everything is interactive",
    ],
  },
  nuxt: {
    pros: [
      "The Vue answer to Next.js: SSR, file routing and Nitro server engine",
      "Auto-imports and modules ecosystem remove most boilerplate",
      "Excellent defaults for SEO and performance",
    ],
    cons: [
      "Major-version migrations have historically required real rework",
      "Smaller hiring pool than React meta-frameworks",
    ],
  },
  typescript: {
    pros: [
      "Catches whole bug classes at compile time — refactors become safe",
      "Types are documentation that can't rot; IDE autocomplete is transformative",
      "Incremental adoption: plain JS files are valid TS",
    ],
    cons: [
      "Build-tooling and type-acrobatics overhead on complex generic code",
      "Strictness configuration varies per project, hurting portability",
    ],
  },
  go: {
    pros: [
      "Deploys as a single static binary — operations couldn't be simpler",
      "Goroutines + channels make concurrency approachable",
      "Stable language with a standard library that covers most backend needs",
    ],
    cons: [
      "Error handling and lack of generics ergonomics feel verbose",
      "Minimalist by design — expect to build or wire up what Rails/Django give you",
    ],
  },
  rust: {
    pros: [
      "Memory safety without a garbage collector; fearless concurrency",
      "Cargo is arguably the best-in-class package manager and build tool",
      "Performance matches C/C++ for systems work",
    ],
    cons: [
      "Steep learning curve — ownership and lifetimes take real time",
      "Compile times slow iteration on large projects",
    ],
  },
  python: {
    pros: [
      "Readable syntax and a library for literally everything (data, AI, web, scripting)",
      "Fastest path from idea to working script for most tasks",
      "Dominant in data/ML — ecosystem lock-in is a feature",
    ],
    cons: [
      "Runtime performance and GIL limit CPU-bound concurrency",
      "Packaging/environments (pip, venv, poetry, uv) remain fragmented",
    ],
  },
  bun: {
    pros: [
      "Dramatically faster installs and script startup than npm/node",
      "All-in-one: runtime, package manager, test runner and bundler",
      "Drop-in Node compatibility for most projects",
    ],
    cons: [
      "Younger runtime — occasional edge-case Node API gaps",
      "Team standardization: Node is still the safe default in enterprises",
    ],
  },
  deno: {
    pros: [
      "Secure by default (no file/net access without permission flags)",
      "TypeScript and web-standard APIs work out of the box",
      "Built-in tooling: formatter, linter, test runner, compile-to-binary",
    ],
    cons: [
      "npm compatibility is good but not byte-perfect",
      "Smaller ecosystem than Node for production services",
    ],
  },

  // ── Styling & UI ──────────────────────────────────────────────────────
  "tailwind-css": {
    pros: [
      "Design directly in markup — no naming systems, no context switching",
      "Design tokens constrain you to a consistent system automatically",
      "Dead CSS is impossible: classes compile from what you use",
    ],
    cons: [
      "Long class strings hurt template readability without extraction discipline",
      "Runtime debugging of generated styles takes getting used to",
    ],
  },
  "shadcn-ui": {
    pros: [
      "You own the code — components are copied into your repo, not installed",
      "Built on Radix primitives, so accessibility comes for free",
      "Tailwind-native theming with dark mode done right",
    ],
    cons: [
      "Updates are manual — copied code doesn't auto-upgrade",
      "Opinionated Radix+Tailwind stack; adopting elsewhere needs porting",
    ],
  },
  "radix-ui": {
    pros: [
      "Best-in-class accessibility and keyboard behavior for complex primitives",
      "Completely unstyled — your design system, not theirs",
    ],
    cons: [
      "You bring every bit of styling — slow start without shadcn-style wrappers",
      "Some primitives demand careful composition to look right",
    ],
  },
  "material-ui": {
    pros: [
      "Mature, complete and battle-tested since 2014",
      "Material Design compliance out of the box suits internal tools",
    ],
    cons: [
      "Escaping the Material look is possible but fights the library",
      "Bundle size and emotion-based styling overhead",
    ],
  },
  mantine: {
    pros: [
      "100+ hooks and components with a coherent, modern look",
      "Excellent dark mode and form handling included",
    ],
    cons: [
      "Smaller community than MUI/Ant — fewer Stack Overflow answers",
    ],
  },
  "ant-design": {
    pros: [
      "Unmatched breadth of enterprise components (tables, forms, charts)",
      "Proven in countless admin panels and dashboards",
    ],
    cons: [
      "Distinctive Ant look is hard to fully rebrand",
      "Chinese-first documentation/issue history can slow debugging",
    ],
  },
  "daisyui": {
    pros: [
      "Pure CSS component classes on Tailwind — no JS runtime cost",
      "Theme system with 30+ ready themes",
    ],
    cons: [
      "Class-based API is less composable than component libraries",
    ],
  },

  // ── Backend & APIs ────────────────────────────────────────────────────
  fastapi: {
    pros: [
      "Async, fast, and automatic OpenAPI docs from type hints",
      "Pydantic validation gives request/response safety for free",
    ],
    cons: [
      "Ecosystem assumes async competence — sync code blocks the event loop",
      "Wiring auth/admin typically means assembling extra libraries",
    ],
  },
  django: {
    pros: [
      "Batteries included: ORM, admin, auth, migrations — ship real products fast",
      "Twenty years of stability and documentation",
    ],
    cons: [
      "Async story is newer and less central than FastAPI's",
      "Monolithic conventions feel heavy for microservice architectures",
    ],
  },
  laravel: {
    pros: [
      "Best-in-class DX: Eloquent, queues, scheduling, testing — all cohesive",
      "Forge/Vapor ecosystem makes deployment nearly turnkey",
    ],
    cons: [
      "Magic-heavy (facades, macros) can obscure what's actually happening",
      "Real-time and async paths (beyond queues) are less native than Node",
    ],
  },
  nestjs: {
    pros: [
      "Structured Angular-style architecture scales across large teams",
      "First-class TypeScript with decorators, DI and modules",
    ],
    cons: [
      "Heavy ceremony for small services",
      "Opinionated layering takes time to learn even for TS veterans",
    ],
  },
  express: {
    pros: [
      "The de-facto Node standard — every middleware you'll ever need exists",
      "Tiny surface area; you can learn it in an afternoon",
    ],
    cons: [
      "No structure imposed — architecture discipline is on you",
      "Callback-era design; async error handling needs extra care",
    ],
  },
  hono: {
    pros: [
      "Runs on every runtime (Node, Bun, Deno, Cloudflare, Vercel Edge) from one codebase",
      "Tiny and extremely fast with first-class TypeScript types",
    ],
    cons: [
      "Minimal by design — larger apps assemble validation/auth themselves",
    ],
  },
  "spring-boot": {
    pros: [
      "The enterprise JVM standard — every integration exists",
      "Production features (metrics, health checks, security) via starters",
    ],
    cons: [
      "Memory footprint and startup time need tuning (AOT/GraalVM helps)",
      "Annotation magic has a steep debugging curve",
    ],
  },
  "ruby-on-rails": {
    pros: [
      "Still the fastest path from zero to a full product (scaffolding, conventions)",
      "Opinionated structure means any Rails dev can navigate any Rails app",
    ],
    cons: [
      "Monolith conventions resist service-oriented designs",
      "Ruby performance ceiling for CPU-heavy work",
    ],
  },

  // ── Data & databases ──────────────────────────────────────────────────
  postgresql: {
    pros: [
      "The most capable open-source relational DB — JSONB, full-text, extensions",
      "Extensions (pgvector, PostGIS) turn it into search/AI/geo infrastructure",
      "Default safe choice for nearly any new application",
    ],
    cons: [
      "Read scaling requires effort (replicas, pooling, sharding tools)",
      "Version upgrades historically need planning (logical replication helps)",
    ],
  },
  mysql: {
    pros: [
      "Ubiquitous, fast for read-heavy web workloads, ultra-familiar to hosts",
      "Replication is simple and battle-tested",
    ],
    cons: [
      "Fewer advanced features than Postgres (weaker JSON, fewer extensions)",
      "Dialect fragmentation across forks (MySQL vs MariaDB)",
    ],
  },
  mongodb: {
    pros: [
      "Flexible schema accelerates iteration on evolving documents",
      "Horizontal scaling and aggregation pipeline are first-class",
    ],
    cons: [
      "Multi-entity transactions/relations push you back toward SQL thinking",
      "Vendor-coupled advanced features (Atlas)",
    ],
  },
  redis: {
    pros: [
      "Sub-millisecond in-memory access for cache, queues, sessions and rate limits",
      "Data structures (streams, sets, sorted sets) solve many patterns",
    ],
    cons: [
      "Memory-bound — dataset size costs money fast",
      "Persistence is secondary by design; not a system of record",
    ],
  },
  sqlite: {
    pros: [
      "Zero-config, serverless, single-file — the most deployed DB on earth",
      "With WAL it handles surprising amounts of concurrent web traffic (litefs-style stacks)",
    ],
    cons: [
      "Single-writer architecture limits horizontal write scaling",
      "No built-in network protocol — remote access needs wrappers (Turso, rqlite)",
    ],
  },
  duckdb: {
    pros: [
      "OLAP-grade analytical SQL directly over Parquet/CSV files — no server",
      "In-process like SQLite but columnar and vectorized",
    ],
    cons: [
      "Analytical, not transactional — wrong tool for OLTP apps",
    ],
  },
  supabase: {
    pros: [
      "Postgres + auth + storage + realtime + auto REST/GraphQL APIs",
      "Self-hostable open core — no hard vendor lock-in",
    ],
    cons: [
      "Row-level security policies are powerful but have a learning curve",
      "Complex queries outgrow the auto-generated API and need functions",
    ],
  },
  prisma: {
    pros: [
      "Schema-as-code with generated, fully-typed client",
      "Migrations and studio tooling make DB workflow pleasant",
    ],
    cons: [
      "Rust query engine binary adds cold-start weight on serverless",
      "Complex raw SQL escapes the type safety story",
    ],
  },
  "drizzle-orm": {
    pros: [
      "SQL-like API with full type inference — no query-engine binary",
      "Lightweight; excellent fit for serverless and edge runtimes",
    ],
    cons: [
      "Younger ecosystem — fewer guides, adapters and edge fixes than Prisma",
    ],
  },
  "apache-kafka": {
    pros: [
      "Durable, replayable event log at massive throughput",
      "Ecosystem (Connect, Streams) covers most integration patterns",
    ],
    cons: [
      "Operational complexity is real — partitioning and rebalancing need expertise",
      "Overkill for low-volume event flows; consider queues first",
    ],
  },
  rabbitmq: {
    pros: [
      "Sophisticated routing (exchanges, topics) and per-message semantics",
      "Mature management UI and wide protocol support",
    ],
    cons: [
      "Throughput ceiling well below Kafka for log-style workloads",
    ],
  },
  meilisearch: {
    pros: [
      "Typo-tolerant, instant search with sane defaults in minutes",
      "Single binary, REST API — self-hosting is genuinely easy",
    ],
    cons: [
      "Relevance tuning is simpler (less powerful) than Elasticsearch/Lucene",
    ],
  },
  qdrant: {
    pros: [
      "Fast vector search with payload filtering in one self-hostable binary",
      "Quantization and hybrid search options for scale",
    ],
    cons: [
      "Younger than the SQL giants — operational playbook still maturing",
    ],
  },

  // ── DevOps & infra ────────────────────────────────────────────────────
  docker: {
    pros: [
      "Universal packaging — one image runs identically on laptop and prod",
      "Compose makes multi-service local dev reproducible",
    ],
    cons: [
      "Desktop licensing and resource usage on macOS/Windows annoy",
      "Layer/image hygiene (sizes, secrets) needs discipline",
    ],
  },
  kubernetes: {
    pros: [
      "De-facto orchestration standard — portable across every cloud",
      "Declarative self-healing and rolling deploys out of the box",
    ],
    cons: [
      "Steep operational learning curve; smallest viable cluster still costs effort",
      "Overkill below several services or meaningful traffic",
    ],
  },
  terraform: {
    pros: [
      "Largest provider ecosystem for infrastructure-as-code",
      "Plan/apply workflow makes infra changes reviewable and safe",
    ],
    cons: [
      "State management (locking, drift) is a discipline of its own",
      "License change pushed many teams toward OpenTofu",
    ],
  },
  "github-actions": {
    pros: [
      "CI/CD lives where your code lives — zero extra vendor",
      "Marketplace actions cover nearly every integration",
    ],
    cons: [
      "Costs at scale; self-hosted runners add ops work",
      "Complex workflows become hard-to-debug YAML",
    ],
  },
  vercel: {
    pros: [
      "Zero-config previews per PR — review UIs change code review",
      "Edge network, ISR and image optimization just work with Next.js",
    ],
    cons: [
      "Costs can surprise at scale (bandwidth, function usage)",
      "Vendor-coupling to their runtime idioms",
    ],
  },
  cloudflare: {
    pros: [
      "Global edge network with generous free tier (CDN, Workers, R2, DNS)",
      "Workers runtime is the strongest serverless-edge story",
    ],
    cons: [
      "Workers runtime differences (not full Node) require adaptation",
      "Deep features sprawl across many products",
    ],
  },
  nginx: {
    pros: [
      "Battle-tested reverse proxy/load balancer at any scale",
      "Every hosting provider and tutorial speaks Nginx",
    ],
    cons: [
      "Config syntax is terse and error-prone",
      "Reloading configs and TLS management are manual compared to Caddy",
    ],
  },
  caddy: {
    pros: [
      "Automatic HTTPS via Let's Encrypt — zero certificate management",
      "Clean, human-readable config (or JSON API)",
    ],
    cons: [
      "Lower raw throughput ceiling than Nginx in some benchmarks",
      "Smaller ecosystem of pre-written config recipes",
    ],
  },
  prometheus: {
    pros: [
      "The metrics standard for cloud-native — pull model + PromQL is powerful",
      "Every exporter you could need exists",
    ],
    cons: [
      "Single-node; long-term storage needs Thanos/Cortex/Mimir",
      "No logs or traces — assemble the rest of observability separately",
    ],
  },
  grafana: {
    pros: [
      "Visualization standard for metrics, logs and traces in one place",
      "Datasource-agnostic — Prometheus, Loki, SQL, everything",
    ],
    cons: [
      "Dashboards drift into entropy without review discipline",
      "Alerting configuration moved across versions, confusing history",
    ],
  },
  sentry: {
    pros: [
      "Error tracking with stack traces, release tagging and blame-worthy context",
      "Performance tracing ties slow endpoints to the actual spans",
    ],
    cons: [
      "Costs scale with event volume — sampling strategy required",
      "SDK weight in client bundles",
    ],
  },

  // ── Productivity & editors ────────────────────────────────────────────
  "vs-code": {
    pros: [
      "Extension marketplace is the largest in existence",
      "Remote development (SSH, containers, WSL) is best-in-class",
    ],
    cons: [
      "Electron memory footprint on huge workspaces",
      "Telemetry/branding — VSCodium exists for the purists",
    ],
  },
  neovim: {
    pros: [
      "Modal editing plus Lua config — keyboard-speed everything",
      "LSP makes it a genuine lightweight IDE",
    ],
    cons: [
      "Configuration is a project in itself (even with distros like LazyVim)",
      "Debugging and remote-tooling UX trails VS Code",
    ],
  },
  zed: {
    pros: [
      "GPU-accelerated — typing latency feels instant even in huge repos",
      "Collaboration built in (share a project like a doc)",
    ],
    cons: [
      "Extension ecosystem is young compared to VS Code",
    ],
  },
  cursor: {
    pros: [
      "AI-native editing: multi-file edits from natural language are genuinely productive",
      "Codebase-aware context beats generic chat windows",
    ],
    cons: [
      "Subscription cost per seat",
      "Fork of VS Code — extension compatibility occasionally lags",
    ],
  },
  "github-copilot": {
    pros: [
      "Inline completions inside your existing editor — zero context switching",
      "Strong on boilerplate, tests and familiar patterns",
    ],
    cons: [
      "Suggests confident-but-wrong code; review discipline stays mandatory",
      "License/provenance questions for some teams",
    ],
  },
  "claude-code": {
    pros: [
      "Agentic terminal workflow — reads, plans, edits and runs across your repo",
      "Strong at multi-step refactors with permission gates",
    ],
    cons: [
      "Token costs on large codebases can add up fast",
      "Terminal-first UX is a change from GUI assistants",
    ],
  },
  ollama: {
    pros: [
      "One command to run any open model locally — privacy by default",
      "OpenAI-compatible API for local experimentation",
    ],
    cons: [
      "Hardware-bound: model quality is capped by your GPU/RAM",
      "No built-in UI (pairs with Open WebUI)",
    ],
  },
  postman: {
    pros: [
      "The API client standard — collections, environments, docs, mocking",
      "Team workspaces keep API knowledge shared",
    ],
    cons: [
      "Heavier Electron app; login requirement annoys",
      "Free tier limits push teams to paid plans quickly",
    ],
  },
  bruno: {
    pros: [
      "Requests are plain files in your repo — versioned with the code",
      "Fast, offline-first, no login, no cloud account",
    ],
    cons: [
      "Fewer enterprise features (mock servers, API docs) than Postman",
    ],
  },
  figma: {
    pros: [
      "The design-collaboration standard — real-time, browser-based, plugin-rich",
      "Dev Mode measures, inspects and exports without designers",
    ],
    cons: [
      "Seat pricing adds up for larger teams",
      "Performance suffers on very large files",
    ],
  },

  // ── Testing & quality ─────────────────────────────────────────────────
  vitest: {
    pros: [
      "Vite-powered — instant watch mode and ESM-native",
      "Jest-compatible API makes migration nearly drop-in",
    ],
    cons: [
      "Node/edge emulation (jsdom environment differences) still bites sometimes",
    ],
  },
  jest: {
    pros: [
      "The established standard — snapshots, mocks and a decade of guides",
      "Huge ecosystem of matchers and reporters",
    ],
    cons: [
      "Slower and more TS-configuration-heavy than Vitest on modern setups",
    ],
  },
  playwright: {
    pros: [
      "Auto-waiting, multi-browser, parallel and trace-based debugging — E2E that doesn't flake as much",
      "Codegen records interactions as test code",
    ],
    cons: [
      "Browser downloads and CI setup are heavier than unit testing",
    ],
  },
  eslint: {
    pros: [
      "The JS linting standard — every framework ships an eslint config",
      "AST plugin ecosystem catches real bugs, not just style",
    ],
    cons: [
      "Config churn (eslintrc → flat config) migrates painfully",
    ],
  },
  prettier: {
    pros: [
      "Ends formatting debates — one opinion, enforced everywhere",
      "Zero configuration by design",
    ],
    cons: [
      "Occasional ugly output on dense expressions",
    ],
  },
  pnpm: {
    pros: [
      "Content-addressed store saves gigabytes and installs fast",
      "Strict node_modules prevents phantom dependencies",
    ],
    cons: [
      "Rare tooling assumptions about hoisted layouts still break",
    ],
  },

  // ── Standards & references ────────────────────────────────────────────
  mcp: {
    pros: [
      "One protocol connects any AI assistant to any tool/data source",
      "Broad adoption by Claude, Cursor, Copilot and IDE vendors",
    ],
    cons: [
      "Spec still evolving — transports and auth patterns shift",
    ],
  },
};
