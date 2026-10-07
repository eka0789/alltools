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

  // ── Depth pass: frontend & build tooling ─────────────────────────────
  bootstrap: {
    pros: [
      "Largest ready-made component + utility catalog of any CSS framework",
      "Massive ecosystem of themes, templates and answers — a decade of Stack Overflow",
      "Predictable class API stays stable across major versions",
    ],
    cons: [
      "Default look is instantly recognizable — sites need heavy theming to escape it",
      "Utility classes now overlap with Tailwind while shipping more opinionated components",
      "Pulling in full Bootstrap for one or two components is overkill",
    ],
  },
  storybook: {
    pros: [
      "Component workbench: build and review states in isolation from the app",
      "Industry-standard for design systems — addons for a11y, docs and visual tests",
      "Stories double as living documentation for designers and QA",
    ],
    cons: [
      "Heavy setup and maintenance for small projects — config, addons and upgrades add up",
      "Stories drift from reality unless updating them is part of the team workflow",
      "Start-up cost slows simple apps more than it helps them",
    ],
  },
  vite: {
    pros: [
      "Instant dev server via native ESM — no bundling while coding",
      "One tool covers React, Vue, Svelte and vanilla with sane defaults",
      "Huge plugin ecosystem; most frameworks made it their default",
    ],
    cons: [
      "Dev and production pipelines differ — rare bundler-specific bugs appear only in prod builds",
      "Custom build setups (module federation, exotic loaders) still favor webpack",
    ],
  },
  webpack: {
    pros: [
      "Handles almost any build scenario — loaders and plugins for everything",
      "Mature code-splitting, chunking and caching knobs for complex apps",
      "Decades of Stack Overflow answers for every conceivable error",
    ],
    cons: [
      "Slow dev builds and painful config compared to Vite/esbuild-era tools",
      "Configuration is notoriously hard to reason about and upgrade",
      "New projects rarely have a reason to choose it over Vite anymore",
    ],
  },
  redux: {
    pros: [
      "Predictable single store with time-travel debugging and strict patterns",
      "RTK (Redux Toolkit) removes most of the old boilerplate pain",
      "Enormous middleware ecosystem and team familiarity",
    ],
    cons: [
      "Heavy mental overhead for small-to-medium apps — most don't need a global store",
      "RTK Query competes with TanStack/SWR, splitting the data-fetching story",
    ],
  },
  zustand: {
    pros: [
      "Tiny API — a store is one function, no providers or actions boilerplate",
      "Selective subscriptions avoid re-render storms by default",
      "Works outside React (setters callable from plain TS code)",
    ],
    cons: [
      "No built-in devtools story as rich as Redux's",
      "Freedom means teams can still tangle themselves without conventions",
    ],
  },
  jotai: {
    pros: [
      "Atomic model: state composes bottom-up with automatic dependency tracking",
      "Excellent for derived/async state — atoms chain naturally",
      "Very small bundle and minimal API surface",
    ],
    cons: [
      "Atom sprawl is easy — the global state picture is harder to see than in a store",
      "Fewer learning resources than Redux/Zustand",
    ],
  },
  htmx: {
    pros: [
      "Dynamic UIs from plain HTML attributes — no JS build step required",
      "Pairs perfectly with server-rendered stacks (Django, Rails, Go)",
      "Tiny (~14 kB) and CSP-friendly",
    ],
    cons: [
      "Complex interactions quickly become attribute soup across templates",
      "Debugging and optimistic UI are harder than in a real SPA framework",
      "Ecosystem is small — you rebuild patterns other frameworks ship",
    ],
  },
  "react-hook-form": {
    pros: [
      "Uncontrolled-by-default design keeps forms fast and re-renders minimal",
      "First-class validation via zod/yup resolvers",
      "Small API covers forms of any complexity without state gymnastics",
    ],
    cons: [
      "Controlled-component integration (MUI, headless selects) needs Controller boilerplate",
      "Dynamic nested field arrays get verbose fast",
    ],
  },
  solidjs: {
    pros: [
      "True fine-grained reactivity — no VDOM, no re-render costs",
      "Familiar JSX syntax with best-in-class raw performance",
      "Signals model influenced the current React/Svelte direction",
    ],
    cons: [
      "Much smaller ecosystem — libraries and jobs are scarce vs React",
      "Differences from React hooks (no re-runs) trip up experienced React devs",
    ],
  },
  "framer-motion": {
    pros: [
      "Declarative animations with layout animation and gesture support few libraries match",
      "Spring physics and orchestration (stagger, variants) out of the box",
      "Now maintained as Motion, with vanilla JS support",
    ],
    cons: [
      "Bundle weight is real for simple fade-ins",
      "Advanced orchestrations have a learning curve of their own",
    ],
  },
  "alpine-js": {
    pros: [
      "Reactive sprinkles in HTML — dropdowns, tabs, modals without a build step",
      "Perfect for server-rendered apps needing light interactivity",
      "~15 kB, readable, zero tooling",
    ],
    cons: [
      "Not an SPA framework — routing, global state and big apps are out of scope",
      "Logic-in-markup gets messy past small components",
    ],
  },
  gsap: {
    pros: [
      "Most powerful animation timeline engine on the web — scroll, SVG, scrubbing",
      "Rock-solid cross-browser consistency, battle-tested for years",
      "Now fully free including premium plugins (ScrollTrigger, SplitText)",
    ],
    cons: [
      "Imperative API — you manage cleanup and lifecycle in React/Vue yourself",
      "Overkill when CSS transitions or a small library would do",
    ],
  },
  "simple-icons": {
    pros: [
      "3,000+ brand SVG icons in one consistent, searchable set",
      "Multiple consumption paths: npm, CDN, React package",
    ],
    cons: [
      "Monochrome only — brand colors need manual styling",
      "Brand takedowns occasionally remove icons between versions",
    ],
  },
  "lucide-icons": {
    pros: [
      "Clean, consistent icon set with first-class React/Vue/Svelte packages",
      "Tree-shakeable — you ship only the icons you import",
      "Fork of Feather, actively maintained with frequent additions",
    ],
    cons: [
      "Stroke style doesn't fit every brand; no filled variants for many glyphs",
    ],
  },
  heroicons: {
    pros: [
      "Tailwind's official icon set — visual match for Tailwind UI patterns",
      "Solid + outline variants for every icon, MIT licensed",
    ],
    cons: [
      "Smaller catalog than Lucide/Phosphor — niche icons often missing",
    ],
  },
  "phosphor-icons": {
    pros: [
      "Six weights (thin → fill) per glyph — rare flexibility for one icon family",
      "Large catalog (9,000+) with official React, Vue, Flutter and CSS packages",
    ],
    cons: [
      "Multi-weight bundles can pull extra KB if you import the whole family",
    ],
  },

  // ── Depth pass: backend, docs & git ──────────────────────────────────
  "node-js": {
    pros: [
      "One language across the whole stack — the default JS runtime for a reason",
      "npm is the largest package registry in existence",
      "Decades of production hardening; runs everywhere from FaaS to embedded",
    ],
    cons: [
      "Single-threaded model needs workers/clusters for CPU-bound work",
      "Callback/Promise mix and legacy APIs make older codebases messy",
      "Dependency sprawl — a naive install pulls hundreds of packages",
    ],
  },
  flask: {
    pros: [
      "Minimal core — you see and control the whole app",
      "Enormous extension catalog (SQLAlchemy, WTForms, auth) lets you compose your stack",
      "The easiest Python framework for learning web fundamentals",
    ],
    cons: [
      "Bigger apps need self-imposed structure — no batteries included",
      "Async support feels bolted on compared to FastAPI/Litestar",
      "No built-in validation/schema layer; you wire serialization yourself",
    ],
  },
  spring: {
    pros: [
      "The Java enterprise ecosystem: data, security, batch, cloud — all first-party modules",
      "Spring Boot's opinionated starters make production services quick to stand up",
      "Unmatched integration surface (Kafka, JDBC, observability, OAuth)",
    ],
    cons: [
      "Heavier startup and memory footprint than Go/Node equivalents",
      "Magic (proxies, autoconfiguration) obscures what actually runs",
      "Steep learning curve for the full framework surface",
    ],
  },
  grpc: {
    pros: [
      "Contract-first protobuf schemas with generated, type-safe clients",
      "HTTP/2 streaming (unary, server/client/bidirectional) built in",
      "Far more efficient than JSON REST for internal service-to-service calls",
    ],
    cons: [
      "Binary payloads are unreadable without tooling — browser support needs gRPC-Web/Connect",
      "Proto evolution discipline (field numbers, deprecation) is a real maintenance cost",
    ],
  },
  fastify: {
    pros: [
      "Among the fastest mainstream Node frameworks — low overhead per request",
      "JSON-schema-first validation with serialization baked in",
      "Clean plugin architecture with encapsulated contexts",
    ],
    cons: [
      "Smaller ecosystem than Express — some middleware needs adapters",
      "Schema-first style is an adjustment if you just want a quick route",
    ],
  },
  symfony: {
    pros: [
      "Mature, modular PHP framework — use the full stack or just individual components",
      "Laravel borrows from it; Symfony components power many other projects",
      "Best-in-class long-term-support releases for enterprises",
    ],
    cons: [
      "Verbose configuration (YAML/PHP) compared to Laravel's ergonomics",
      "Smaller hiring pool and community buzz than Laravel",
    ],
  },
  phoenix: {
    pros: [
      "Elixir/Erlang VM: massive concurrency with tiny, predictable latencies",
      "LiveView ships rich realtime UIs without writing JavaScript",
      "Channels/Presence make WebSocket-heavy apps trivial",
    ],
    cons: [
      "Elixir is a niche language — hiring and library availability lag mainstream stacks",
      "Fewer turnkey packages; you often write what Rails/Django include",
    ],
  },
  freecodecamp: {
    pros: [
      "Completely free, structured curriculum from HTML to full-stack projects",
      "Certifications and portfolio projects give beginners something concrete to show",
      "Huge community and forum for when you're stuck",
    ],
    cons: [
      "Curriculum depth thins out beyond intermediate topics",
      "Project-driven style won't suit learners who want theory first",
    ],
  },
  "roadmap-sh": {
    pros: [
      "Best visual maps of what to learn (frontend, backend, DevOps, AI) and in what order",
      "Community-maintained, regularly updated with current industry expectations",
      "Great for spotting your knowledge gaps quickly",
    ],
    cons: [
      "A map, not a course — links out to scattered resources of varying quality",
      "Roadmaps can encourage checkbox-learning over building things",
    ],
  },
  devdocs: {
    pros: [
      "200+ official docs (MDN, languages, frameworks) in one fast, offline-capable UI",
      "Instant fuzzy search across all enabled docs at once",
      "Free, open source, and fully usable offline after one download",
    ],
    cons: [
      "Doc versions must be selected manually — stale selections mislead",
      "No community content (Stack Overflow-style answers) — pure reference",
    ],
  },
  devhints: {
    pros: [
      "Cheat-sheet density is excellent — one page refreshes a whole tool",
      "Zero-friction: search, read, go",
    ],
    cons: [
      "Coverage and freshness vary by sheet; some lag modern versions",
      "Community-edited depth is thinner than official docs",
    ],
  },
  "quickref-me": {
    pros: [
      "Clean, modern cheat sheets for languages, tools and Linux commands",
      "Consistent formatting makes scanning fast",
    ],
    cons: [
      "Shallow — a reminder, not a tutorial",
      "Catalog skews toward popular topics",
    ],
  },
  "the-odin-project": {
    pros: [
      "Free, opinionated full-stack path (Ruby or JS) built around real projects",
      "Forces you to research like a working developer instead of following videos",
      "Active Discord community with code review culture",
    ],
    cons: [
      "Demanding — much slower than tutorial-following, by design",
      "Curriculum focuses on web; mobile/data paths are out of scope",
    ],
  },
  husky: {
    pros: [
      "Makes git hooks trivial to install and share with the whole team",
      "Pairs with lint-staged to keep pre-commit checks fast",
    ],
    cons: [
      "Hooks only run locally — CI must enforce the same checks separately",
      "Version upgrades have historically changed install steps",
    ],
  },
  "learn-git-branching": {
    pros: [
      "The best mental-model builder for branches, rebases and cherry-picks",
      "Visualizes every command's effect immediately",
    ],
    cons: [
      "A sandbox — doesn't teach workflows (PRs, conflicts on real remotes)",
    ],
  },
  commitlint: {
    pros: [
      "Enforces Conventional Commits, keeping history machine-readable for changelogs and semver",
      "Integrates with husky and CI the same way",
    ],
    cons: [
      "Convention policing annoys teams who never bought into Conventional Commits",
      "Extra config to maintain for marginal benefit on small projects",
    ],
  },
  "pre-commit": {
    pros: [
      "One YAML pins hooks (format, lint, secrets) across every contributor's machine",
      "Huge registry of ready-made hooks across languages",
    ],
    cons: [
      "Python-based runner in polyglot repos — a JS-only team may prefer husky",
      "Hook environments download/update and can slow first runs",
    ],
  },
  "git-lfs": {
    pros: [
      "Keeps large binaries out of repo history — clones stay small",
      "Transparent once installed: normal git commands just work",
    ],
    cons: [
      "Every collaborator and CI runner must install LFS or files are broken pointers",
      "Hosting quotas/bandwidth limits on GitHub bite at scale",
    ],
  },

  // ── Depth pass: platforms, AI services & cloud ───────────────────────
  chatgpt: {
    pros: [
      "The most capable general-purpose assistant for most everyday tasks",
      "Voice, vision, file analysis and custom GPTs in one place",
      "Free tier is genuinely usable for casual needs",
    ],
    cons: [
      "Answers still need verification for facts, citations and current events",
      "Usage caps and model gating on cheaper plans shift frequently",
      "Privacy settings need review before pasting proprietary code",
    ],
  },
  claude: {
    pros: [
      "Strongest long-document comprehension — book-length context handled well",
      "Best-in-class code understanding and writing quality in side-by-side comparisons",
      "Artifacts make iterating on code/drafts feel interactive",
    ],
    cons: [
      "Usage limits on paid plans are hit earlier than competitors",
      "Multimodal (voice/image) surface is thinner than ChatGPT's",
    ],
  },
  git: {
    pros: [
      "The version-control standard — every other tool assumes it",
      "Branching and offline work are unmatched",
      "Portable skill: identical from CLI to IDEs to GUIs",
    ],
    cons: [
      "Recovery scenarios (rebase gone wrong, detached HEAD) are famously unfriendly",
      "The index/staging model takes real time to internalize",
    ],
  },
  github: {
    pros: [
      "Where open source lives — PRs, issues, Actions and Packages in one place",
      "Copilot, security alerts and project boards integrate without setup",
      "Marketplace and API make it the automation hub for most teams",
    ],
    cons: [
      "UI slows down on very large repos and long PR threads",
      "Advanced features (Codespaces, larger runners) get expensive per seat",
    ],
  },
  notion: {
    pros: [
      "Docs, databases and wikis blend freely — one workspace per team",
      "Relational databases and views are genuinely powerful",
      "Good free tier for personal knowledge management",
    ],
    cons: [
      "Slow on large workspaces; offline mode is weak",
      "Search and structure degrade without disciplined conventions",
      "Export/lock-in: leaving Notion with years of nested content hurts",
    ],
  },
  canva: {
    pros: [
      "Anyone can produce presentable social/brand assets in minutes",
      "Brand kits and team templates keep output consistent",
      "Massive template and stock library included",
    ],
    cons: [
      "Not a precision tool — complex vector/editing tasks hit limits fast",
      "Best features (background remover, brand kit) sit behind Pro",
    ],
  },
  "intellij-idea": {
    pros: [
      "Deepest JVM code intelligence: refactoring and inspections are best-in-class",
      "Everything included — profiler, debugger, DB tools, Spring support",
    ],
    cons: [
      "Heavy on RAM and startup time",
      "Ultimate features (framework support) require a paid subscription",
    ],
  },
  "visual-studio": {
    pros: [
      "The complete .NET/Windows development experience — debugger and profiler are superb",
      "First-class support for legacy + modern Microsoft stacks",
    ],
    cons: [
      "Windows-centric; macOS parity lags",
      "Large install and slower UI than VS Code",
    ],
  },
  xcode: {
    pros: [
      "The only real path to iOS/macOS SDKs, simulators and App Store submission",
      "SwiftUI previews make UI iteration fast",
    ],
    cons: [
      "Mac-only and huge (tens of GB)",
      "Infamous for indexing bugs, signing errors and slow upgrades",
    ],
  },
  "android-studio": {
    pros: [
      "Official Android IDE — emulator, profilers and layout inspection included",
      "IntelliJ foundation gives strong Kotlin/Java intelligence",
    ],
    cons: [
      "Heavy: RAM-hungry emulator plus slow first-run setup",
      "Gradle sync/upgrades consume real dev time",
    ],
  },
  obsidian: {
    pros: [
      "Your notes are plain Markdown files on disk — no lock-in",
      "Backlinks, graph view and 2,000+ community plugins",
      "Free for personal use; sync across devices is local or paid",
    ],
    cons: [
      "Plugin quality varies; heavy setups become fragile",
      "Real-time collaboration is essentially absent",
    ],
  },
  perplexity: {
    pros: [
      "Answers with cited sources — research questions come with receipts",
      "Focus modes (academic, Reddit) target searches well",
    ],
    cons: [
      "Long-form writing and coding are weaker than general assistants",
      "Deep research quality depends heavily on what's indexed",
    ],
  },
  "hugging-face": {
    pros: [
      "The GitHub of ML: models, datasets and Spaces demos in one hub",
      "Transformers library is the default for working with open models",
      "Generous free hosting for demos via Spaces",
    ],
    cons: [
      "Model quality varies wildly — cards must be read carefully",
      "Inference pricing on the Hub adds up vs self-hosting at scale",
    ],
  },
  jupyter: {
    pros: [
      "The standard interactive environment for data work — code, plots and notes together",
      "Kernels for dozens of languages; Colab/VS Code interop is trivial",
      "Notebooks are the lingua franca of data science sharing",
    ],
    cons: [
      "Hidden notebook state (out-of-order cells) causes irreproducible results",
      "Poor fit for production code — notebooks need refactoring into modules",
    ],
  },
  kaggle: {
    pros: [
      "Free GPU/TPU notebooks and thousands of real datasets",
      "Competitions are the fastest way to pressure-test ML skills",
      "Community notebooks teach practical techniques",
    ],
    cons: [
      "Competition metrics reward tricks over production-ready practice",
      "Session limits (GPU hours, runtime) constrain serious training",
    ],
  },
  firebase: {
    pros: [
      "Fastest path to a working app: auth, Firestore, hosting and analytics out of the box",
      "Realtime sync and offline mode are production-grade",
      "Generous free Spark tier for side projects",
    ],
    cons: [
      "Firestore pricing (per-read) explodes with naive query patterns",
      "Query limits and vendor lock-in hurt complex data models",
      "Local emulation/CI story is clunkier than Supabase/Postgres stacks",
    ],
  },
  aws: {
    pros: [
      "The widest service catalog — anything is buildable, mature tooling everywhere",
      "Free tier and credits make experimentation cheap at first",
      "Employability: AWS experience is the industry default",
    ],
    cons: [
      "Billing complexity is notorious — surprise invoices need vigilance",
      "IAM and service sprawl punish small teams that just need 'a server + DB'",
    ],
  },
  "google-cloud": {
    pros: [
      "Best-in-class data stack: BigQuery, Spanner and Pub/Sub",
      "GKE is the most mature managed Kubernetes",
      "Sustained-use discounts beat AWS pricing on steady workloads",
    ],
    cons: [
      "Third in mindshare — fewer turnkey integrations and tutorials than AWS",
      "Console/service organization churns more often",
    ],
  },
  netlify: {
    pros: [
      "The Jamstack original: git-push deploys, preview URLs, forms and functions",
      "Zero-config for most static generators and frontend frameworks",
      "Generous free tier for personal sites",
    ],
    cons: [
      "Function invocation and bandwidth costs grow fast on real traffic",
      "Backend-heavy needs outgrow it quickly — pair with a real API host",
    ],
  },
  railway: {
    pros: [
      "Deploy full-stack services + databases from a repo in minutes",
      "Usage-based pricing that's honest for hobby-to-midsize projects",
      "Preview environments and templates are excellent",
    ],
    cons: [
      "No permanent free tier — sleeping projects still cost something",
      "Infra knobs (networking, compliance) are limited vs AWS/GCP",
    ],
  },
  render: {
    pros: [
      "Heroku-style simplicity with modern pricing: autoscaling, cron, background workers",
      "Free static hosting plus managed Postgres/Redis in one place",
      "Zero-downtime deploys from git are painless",
    ],
    cons: [
      "Free services spin down (cold starts of ~50s)",
      "Fewer regions and enterprise features than big clouds",
    ],
  },
  "fly-io": {
    pros: [
      "Runs real containers close to users via regions worldwide",
      "Full VMs/instances — no serverless cold-start surprises",
      "Great for Postgres-backed apps needing geo-distribution",
    ],
    cons: [
      "Requires ops comfort (fly.toml, certs, scaling) unlike PaaS rivals",
      "Past reliability incidents make teams keep a fallback",
    ],
  },
  "openai-api": {
    pros: [
      "Frontier model quality with the most polished developer platform",
      "Structured outputs, function calling and embeddings cover most product needs",
      "De-facto standard — SDK patterns copy across the industry",
    ],
    cons: [
      "Costs at scale require real rate/caching design",
      "Rate limits and model deprecations churn faster than teams would like",
    ],
  },
  "anthropic-api": {
    pros: [
      "Claude models excel at code, long-context and agentic tasks",
      "Prompt caching cuts cost dramatically for repeated context",
      "MCP emerged here — best tool-use ecosystem story",
    ],
    cons: [
      "Fewer turnkey vertical features than OpenAI's platform",
      "Rate limits for new orgs start conservative",
    ],
  },
  openrouter: {
    pros: [
      "One API key and one schema reach hundreds of models (OpenAI, Anthropic, open weights)",
      "Easy per-model price/latency comparison and fallback routing",
      "Great for avoiding vendor lock-in at the model layer",
    ],
    cons: [
      "Adds a small markup and an extra hop vs calling providers directly",
      "Provider-side features (caching, beta endpoints) can lag the original APIs",
    ],
  },
  v0: {
    pros: [
      "Fastest way from prompt to shippable React + Tailwind + shadcn/ui code",
      "Generated UIs use real components, not throwaway mockups",
      "Iterative chat editing keeps momentum on frontend work",
    ],
    cons: [
      "Complex state/logic still needs a human engineer",
      "Credits constrain heavy iteration on paid tiers",
    ],
  },
  "bolt-new": {
    pros: [
      "Full-stack app generation with in-browser runtime — prompt to running app",
      "Deploys and env wiring handled inside the tool",
      "Supports more stacks than pure-UI generators",
    ],
    cons: [
      "Token burn is fast on iterative debugging",
      "Architecture decisions by AI need review before real production use",
    ],
  },
  replit: {
    pros: [
      "Zero-setup IDE + hosting — the lowest friction to run code anywhere",
      "Collaboration and deploy from the same tab",
      "Agent mode scaffolds simple apps end-to-end",
    ],
    cons: [
      "Performance and pricing on compute tiers bite for serious workloads",
      "Not a substitute for a configured local toolchain on large projects",
    ],
  },
};
