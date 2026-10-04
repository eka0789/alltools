// Developer glossary — the "dictionary" half of Developer Dictionary.
// Plain-English definitions for the terms developers keep encountering,
// each linked back to real tools in the catalog. relatedTools/relatedTerms
// slugs are validated by `npm run validate`.

export interface GlossaryTerm {
  slug: string;
  term: string;
  category: GlossaryCategory;
  short: string;
  definition: string;
  example?: string;
  relatedTools?: string[];
  relatedTerms?: string[];
}

export type GlossaryCategory =
  | "Web & API"
  | "Rendering"
  | "Database"
  | "DevOps & Infra"
  | "Security"
  | "Architecture"
  | "Programming Concepts"
  | "Testing";

export const GLOSSARY_CATEGORY_ORDER: GlossaryCategory[] = [
  "Programming Concepts",
  "Web & API",
  "Rendering",
  "Database",
  "Architecture",
  "DevOps & Infra",
  "Security",
  "Testing",
];

export const GLOSSARY: GlossaryTerm[] = [
  // ── Programming Concepts ────────────────────────────────────────────────
  {
    slug: "api",
    term: "API",
    category: "Web & API",
    short: "A contract that lets two programs talk to each other.",
    definition:
      "Application Programming Interface — a defined set of requests and responses that lets one piece of software use another without knowing its internals. 'Calling an API' usually means sending HTTP requests to a service and parsing its JSON response.",
    example: 'GET https://api.github.com/users/octocat returns a JSON profile.',
    relatedTools: ["postman", "bruno", "insomnia", "hoppscotch"],
    relatedTerms: ["rest", "graphql", "crud"],
  },
  {
    slug: "rest",
    term: "REST",
    category: "Web & API",
    short: "API design style built on resources, URLs and HTTP verbs.",
    definition:
      "Representational State Transfer — an architectural style where URLs name resources (/users/42) and HTTP methods express intent (GET reads, POST creates, PUT/PATCH updates, DELETE removes). Stateless: every request carries everything needed to serve it.",
    example: "DELETE /articles/42 removes article 42.",
    relatedTools: ["postman", "swagger", "scalar"],
    relatedTerms: ["api", "graphql", "idempotent"],
  },
  {
    slug: "graphql",
    term: "GraphQL",
    category: "Web & API",
    short: "Query language where the client picks exactly which fields it gets back.",
    definition:
      "A query language and runtime for APIs created at Meta. The client sends one query describing the data shape it needs; the server resolves it through a typed schema. Solves over-fetching and under-fetching compared to multiple fixed REST endpoints.",
    example: "{ user(id: 42) { name posts { title } } } returns only names and post titles.",
    relatedTools: ["apollo-graphql", "hasura"],
    relatedTerms: ["api", "rest"],
  },
  {
    slug: "grpc",
    term: "gRPC",
    category: "Web & API",
    short: "High-performance RPC over HTTP/2 with typed protobuf contracts.",
    definition:
      "A remote procedure call framework where services define their contract in .proto files and generate typed client/server stubs. Binaries over HTTP/2 make it much faster than JSON REST — the usual choice for service-to-service traffic in microservices.",
    relatedTools: ["grpc"],
    relatedTerms: ["microservices", "api"],
  },
  {
    slug: "websocket",
    term: "WebSocket",
    category: "Web & API",
    short: "A persistent, two-way connection between browser and server.",
    definition:
      "A protocol that upgrades an HTTP connection into a long-lived socket where both sides can push messages at any time — unlike HTTP request/response where the client must always ask first. Used for chat, live dashboards, multiplayer and collaborative editing.",
    relatedTools: ["socket-io"],
    relatedTerms: ["api"],
  },
  {
    slug: "cors",
    term: "CORS",
    category: "Web & API",
    short: "Browser rules that decide which websites may call an API.",
    definition:
      "Cross-Origin Resource Sharing — the HTTP-header mechanism that lets a page on origin A call an API on origin B. If the API doesn't opt in with headers like Access-Control-Allow-Origin, the browser blocks the response even though the request itself succeeded.",
    example: "api.example.com returning Access-Control-Allow-Origin: https://app.example.com",
    relatedTerms: ["api"],
  },
  {
    slug: "crud",
    term: "CRUD",
    category: "Web & API",
    short: "Create, Read, Update, Delete — the four basic data operations.",
    definition:
      "The four fundamental operations of persistent storage, usually mapped to POST/GET/PUT-PATCH/DELETE in APIs. 'A CRUD app' means an application whose core is forms and lists over a database.",
    relatedTerms: ["api", "rest", "orm"],
  },
  {
    slug: "idempotent",
    term: "Idempotent",
    category: "Web & API",
    short: "Safe to repeat: same result whether called once or ten times.",
    definition:
      "An operation is idempotent when repeating it has no additional effect. GET, PUT and DELETE are idempotent in HTTP; POST is not — that's why payment APIs issue idempotency keys so a retried request can't charge twice.",
    relatedTerms: ["rest", "api"],
  },
  {
    slug: "json",
    term: "JSON",
    category: "Web & API",
    short: "The standard text format for structured data on the web.",
    definition:
      "JavaScript Object Notation — a human-readable format of objects, arrays, strings, numbers and booleans. It is the lingua franca of APIs and config files, and every language has fast parsers for it.",
    example: '{"name": "Ada", "roles": ["admin"], "active": true}',
    relatedTools: ["json-formatter", "json-hero", "quicktype"],
    relatedTerms: ["api"],
  },
  {
    slug: "sdk",
    term: "SDK",
    category: "Web & API",
    short: "A packaged toolkit for building against a platform or API.",
    definition:
      "Software Development Kit — a library or bundle (plus docs and samples) that wraps a service's raw API in convenient language-native calls. 'Use the SDK' usually means installing an official npm/pip package instead of hand-rolling HTTP calls.",
    relatedTerms: ["api"],
  },

  // ── Rendering ───────────────────────────────────────────────────────────
  {
    slug: "spa",
    term: "SPA",
    category: "Rendering",
    short: "One HTML page; JavaScript renders everything after that.",
    definition:
      "Single-Page Application — an app that loads one HTML document and re-renders views client-side as the user navigates, talking to APIs for data. Fast after first load, but ships more JavaScript and needs extra care for SEO.",
    relatedTerms: ["ssr", "hydration"],
  },
  {
    slug: "ssr",
    term: "SSR",
    category: "Rendering",
    short: "Server renders full HTML on each request.",
    definition:
      "Server-Side Rendering — the server generates the complete HTML for each request, so the browser shows content immediately and crawlers see the page. JavaScript then takes over (hydration) for interactivity.",
    relatedTools: ["next-js"],
    relatedTerms: ["ssg", "hydration", "isr"],
  },
  {
    slug: "ssg",
    term: "SSG",
    category: "Rendering",
    short: "Pages pre-built into HTML at deploy time.",
    definition:
      "Static Site Generation — pages are rendered to HTML once, at build time, then served from a CDN. Extremely fast and cacheable; content only changes on a rebuild, which is why it suits docs and marketing sites.",
    relatedTools: ["astro", "next-js", "vitepress"],
    relatedTerms: ["ssr", "isr"],
  },
  {
    slug: "isr",
    term: "ISR",
    category: "Rendering",
    short: "Static pages that regenerate in the background on an interval.",
    definition:
      "Incremental Static Regeneration — Next.js's middle ground between SSG and SSR: pages are served statically but the server rebuilds them in the background after a revalidation window, so content stays fresh without a full redeploy.",
    relatedTools: ["next-js"],
    relatedTerms: ["ssg", "ssr"],
  },
  {
    slug: "hydration",
    term: "Hydration",
    category: "Rendering",
    short: "JavaScript attaches to server-rendered HTML and makes it interactive.",
    definition:
      "The step after SSR/SSG where the client-side framework takes over the existing HTML, attaching event listeners and state so buttons respond and data updates. Mismatches between server and client output cause hydration errors.",
    relatedTerms: ["ssr", "spa"],
  },

  // ── Database ────────────────────────────────────────────────────────────
  {
    slug: "orm",
    term: "ORM",
    category: "Database",
    short: "Map database rows to objects so you query in your language, not SQL.",
    definition:
      "Object-Relational Mapping — a library that maps tables to classes and rows to objects, so application code reads and writes data through its native language instead of raw SQL. Saves boilerplate; deep or hot-path queries still benefit from knowing SQL.",
    example: "db.select().from(users).where(eq(users.id, 42)) instead of SELECT …",
    relatedTools: ["prisma", "drizzle-orm", "typeorm", "sequelize", "sqlalchemy"],
    relatedTerms: ["crud", "n-plus-one", "migration-database"],
  },
  {
    slug: "acid",
    term: "ACID",
    category: "Database",
    short: "Atomicity, Consistency, Isolation, Durability — transaction guarantees.",
    definition:
      "The four properties that make database transactions reliable: a transaction either fully applies or not at all (atomicity), keeps data valid (consistency), doesn't leak partial state between concurrent ones (isolation), and survives crashes once committed (durability).",
    relatedTerms: ["transaction"],
  },
  {
    slug: "transaction",
    term: "Transaction",
    category: "Database",
    short: "A group of writes that all succeed together or not at all.",
    definition:
      "A unit of work executed as one all-or-nothing operation. Classic example: transferring money debits one account and credits another — if the second write fails, the first rolls back so money doesn't vanish.",
    example: "BEGIN; UPDATE …; UPDATE …; COMMIT;",
    relatedTerms: ["acid"],
  },
  {
    slug: "database-index",
    term: "Database Index",
    category: "Database",
    short: "A lookup structure that makes queries fast — at a small write cost.",
    definition:
      "An auxiliary structure (usually a B-tree) the database keeps sorted for fast lookups on a column, turning a full table scan into a targeted seek. Indexes speed reads but slow writes and take space, so they're added deliberately based on real queries.",
    example: "CREATE INDEX idx_users_email ON users(email);",
    relatedTools: ["postgresql", "mysql"],
    relatedTerms: ["n-plus-one"],
  },
  {
    slug: "n-plus-one",
    term: "N+1 Problem",
    category: "Database",
    short: "One query for the list, then N more for each item's detail.",
    definition:
      "A performance anti-pattern where fetching a list of N records triggers N additional queries — one per record — instead of a single join or batched query. Common with lazy-loading ORMs; the fix is eager loading or batching.",
    relatedTools: ["drizzle-orm", "prisma"],
    relatedTerms: ["orm", "database-index"],
  },
  {
    slug: "migration-database",
    term: "Migration",
    category: "Database",
    short: "A versioned, repeatable script that changes the database schema.",
    definition:
      "A tracked change to a database's schema (add a column, create a table) plus its reversal. Migrations keep every environment's schema reproducible and let schema changes ship alongside the code that needs them.",
    relatedTools: ["flyway", "liquibase", "alembic", "drizzle-orm"],
    relatedTerms: ["orm"],
  },
  {
    slug: "connection-pool",
    term: "Connection Pool",
    category: "Database",
    short: "Reuse open database connections instead of paying for a new one per request.",
    definition:
      "A cache of live database connections that requests borrow and return. Opening a connection is expensive (TCP + auth + backend process), so pooling keeps a handful open and amortizes that cost across thousands of requests.",
    relatedTerms: ["transaction"],
  },
  {
    slug: "normalization",
    term: "Normalization",
    category: "Database",
    short: "Structure relational data so each fact is stored exactly once.",
    definition:
      "Designing tables so every piece of data lives in exactly one place (formally, the 1NF–3NF forms). It prevents update anomalies, with the trade-off that reads sometimes need joins — which is why analytics stores often denormalize on purpose.",
    relatedTerms: ["database-index"],
  },

  // ── Architecture ────────────────────────────────────────────────────────
  {
    slug: "microservices",
    term: "Microservices",
    category: "Architecture",
    short: "Split a system into small services that deploy independently.",
    definition:
      "An architectural style where an application is composed of small, independently deployable services, each owning its own data and communicating over the network. Buys team autonomy and independent scaling at the cost of distributed-systems complexity.",
    relatedTerms: ["monolith", "grpc", "cicd"],
  },
  {
    slug: "monolith",
    term: "Monolith",
    category: "Architecture",
    short: "One codebase, one deployable — all features inside it.",
    definition:
      "A single application containing all functionality, deployed as one unit. Often the right starting point: no network hops, simpler debugging and refactoring. Many 'microservice migrations' later rebuild what the monolith already did well.",
    relatedTerms: ["microservices"],
  },
  {
    slug: "event-driven",
    term: "Event-Driven Architecture",
    category: "Architecture",
    short: "Services react to events instead of calling each other directly.",
    definition:
      "A style where components publish events ('order placed') to a broker and other components subscribe and react, decoupling producers from consumers. Makes it easy to add new reactions to an event, but introduces eventual consistency.",
    relatedTools: ["apache-kafka", "rabbitmq", "nats"],
    relatedTerms: ["microservices"],
  },
  {
    slug: "dependency-injection",
    term: "Dependency Injection",
    category: "Architecture",
    short: "Hand a component its dependencies instead of letting it build them.",
    definition:
      "A pattern where an object receives the things it needs (a database client, a config) from the outside rather than constructing them internally. Dependencies become swappable — real ones in production, fakes in tests.",
    relatedTerms: ["mocking"],
  },
  {
    slug: "caching",
    term: "Caching",
    category: "Architecture",
    short: "Keep expensive results around so you don't compute them twice.",
    definition:
      "Storing a computed result (query, rendered page, API response) and serving the stored copy until it expires or is invalidated. The hard part is invalidation — deciding when a cached value is no longer truthful.",
    relatedTools: ["redis", "valkey"],
    relatedTerms: ["cdn", "reverse-proxy"],
  },
  {
    slug: "load-balancing",
    term: "Load Balancer",
    category: "Architecture",
    short: "Spread incoming traffic across multiple servers.",
    definition:
      "A component that distributes requests across a pool of servers, which gives horizontal scaling (add machines to add capacity) and resilience (unhealthy servers stop receiving traffic).",
    relatedTools: ["nginx", "traefik", "caddy"],
    relatedTerms: ["reverse-proxy", "stateless"],
  },
  {
    slug: "reverse-proxy",
    term: "Reverse Proxy",
    category: "DevOps & Infra",
    short: "A server that sits in front of your app and forwards requests to it.",
    definition:
      "A gateway that receives client requests and forwards them to backend services, adding TLS termination, compression, caching, rate limiting and routing along the way. The public entry point of most self-hosted stacks.",
    relatedTools: ["nginx", "caddy", "traefik"],
    relatedTerms: ["load-balancing", "cdn"],
  },
  {
    slug: "stateless",
    term: "Stateless",
    category: "Architecture",
    short: "Every request is self-contained; servers keep no memory of previous ones.",
    definition:
      "A service design where any instance can handle any request because no session data lives on the server (it's in the client's token or a shared store). Stateless services scale horizontally — just add instances — and survive restarts gracefully.",
    relatedTerms: ["load-balancing", "serverless"],
  },

  // ── DevOps & Infra ──────────────────────────────────────────────────────
  {
    slug: "cicd",
    term: "CI/CD",
    category: "DevOps & Infra",
    short: "Automatically build and test every change (CI), then ship it (CD).",
    definition:
      "Continuous Integration runs the build and test suite on every push so regressions surface within minutes. Continuous Delivery/Deployment automates the release step — either up to a ready-to-deploy artifact (delivery) or all the way to production (deployment).",
    relatedTools: ["github-actions", "gitlab-ci-cd", "jenkins", "circleci"],
    relatedTerms: ["iac"],
  },
  {
    slug: "container",
    term: "Container",
    category: "DevOps & Infra",
    short: "Package an app with its dependencies so it runs the same everywhere.",
    definition:
      "An isolated process that bundles an application with its runtime and libraries, sharing the host kernel. 'It works on my machine' ends because the image IS the machine. Images build once and run identically on a laptop or in production.",
    example: "docker run -p 8080:80 nginx",
    relatedTools: ["docker", "podman"],
    relatedTerms: ["kubernetes", "cicd"],
  },
  {
    slug: "kubernetes",
    term: "Kubernetes",
    category: "DevOps & Infra",
    short: "The orchestrator that runs, scales and heals containers across machines.",
    definition:
      "A container orchestration platform: you declare the desired state ('3 replicas of this image, exposed on port 80') and it continuously reconciles reality toward it — restarting, rescheduling and scaling containers as needed.",
    relatedTools: ["kubernetes", "helm", "k9s"],
    relatedTerms: ["container", "iac"],
  },
  {
    slug: "iac",
    term: "Infrastructure as Code",
    category: "DevOps & Infra",
    short: "Define servers and cloud resources in reviewable, versioned files.",
    definition:
      "Managing infrastructure through declarative files instead of console clicks. The declared state can be code-reviewed, versioned in git and reapplied reliably — a new environment becomes one command, not a runbook.",
    example: "resource \"aws_s3_bucket\" \"assets\" { bucket = \"my-assets\" }",
    relatedTools: ["terraform", "opentofu", "pulumi", "ansible"],
    relatedTerms: ["cicd"],
  },
  {
    slug: "serverless",
    term: "Serverless",
    category: "DevOps & Infra",
    short: "Run code on demand; the provider manages servers and scaling.",
    definition:
      "A hosting model where you deploy functions and the platform runs them per-request, scaling from zero to thousands of concurrent executions and billing only for actual use. Trade-offs: cold starts, execution time limits and less runtime control.",
    relatedTools: ["vercel", "netlify", "cloudflare"],
    relatedTerms: ["stateless"],
  },
  {
    slug: "blue-green-deployment",
    term: "Blue-Green Deployment",
    category: "DevOps & Infra",
    short: "Run two identical environments; switch traffic between them to release.",
    definition:
      "A release strategy where 'blue' serves live traffic while 'green' runs the new version; once green checks out, the router flips traffic to it — with an instant rollback path (flip back). Canary deployments do the same thing gradually by percentage.",
    relatedTerms: ["cicd"],
  },
  {
    slug: "cdn",
    term: "CDN",
    category: "DevOps & Infra",
    short: "Serve files from edge locations close to the user.",
    definition:
      "Content Delivery Network — servers distributed worldwide that cache your static assets (and often dynamic content) near users, cutting latency and absorbing traffic spikes away from your origin.",
    relatedTools: ["cloudflare"],
    relatedTerms: ["caching"],
  },
  {
    slug: "observability",
    term: "Observability",
    category: "DevOps & Infra",
    short: "Logs, metrics and traces — the three signals that explain system behavior.",
    definition:
      "The practice of instrumenting systems so failures can be diagnosed from the outside: logs record discrete events, metrics track aggregates over time, and distributed traces follow one request across services. Together they turn 'it's slow sometimes' into an answerable question.",
    relatedTools: ["grafana", "prometheus", "sentry", "opentelemetry"],
    relatedTerms: ["microservices"],
  },

  // ── Security ────────────────────────────────────────────────────────────
  {
    slug: "encryption",
    term: "Encryption",
    category: "Security",
    short: "Scramble data so only key-holders can read it — and it's reversible.",
    definition:
      "Transforming readable data into ciphertext using a key. Symmetric encryption (AES) uses one shared key; asymmetric (RSA, ECC) uses a public/private pair, which is what makes TLS on the web possible. Encrypted data can always be decrypted with the right key.",
    relatedTerms: ["hashing", "https-tls"],
  },
  {
    slug: "hashing",
    term: "Hashing",
    category: "Security",
    short: "One-way fingerprint of data — verify without ever storing the original.",
    definition:
      "A hash function maps input to a fixed-size fingerprint that is practically impossible to reverse. Passwords are stored as salted hashes (bcrypt/argon2) so a database leak doesn't leak passwords; any change to the input produces a totally different hash.",
    relatedTerms: ["encryption"],
  },
  {
    slug: "https-tls",
    term: "HTTPS / TLS",
    category: "Security",
    short: "Encrypted, authenticated HTTP — the padlock in the address bar.",
    definition:
      "TLS (the successor of SSL) encrypts traffic between browser and server and proves the server is who it claims to be via certificates. HTTPS is simply HTTP over TLS; modern APIs also use it for server-to-server calls.",
    relatedTools: ["ssl-labs", "lets-debug"],
    relatedTerms: ["encryption"],
  },
  {
    slug: "oauth",
    term: "OAuth",
    category: "Security",
    short: "The standard for 'log in with…' and delegated API access.",
    definition:
      "An authorization framework that lets a user grant an application limited access to their account without sharing their password — the flow behind 'Sign in with Google' and API access tokens. OAuth 2.0 is the version in universal use, usually paired with OIDC for identity.",
    relatedTools: ["keycloak", "auth0", "clerk", "better-auth"],
    relatedTerms: ["jwt"],
  },
  {
    slug: "jwt",
    term: "JWT",
    category: "Security",
    short: "A signed token carrying claims — stateless auth's workhorse.",
    definition:
      "JSON Web Token — a compact, digitally signed token (header.payload.signature) that carries claims like a user id and expiry. Servers verify the signature instead of looking up sessions, which is why JWTs suit stateless and distributed setups.",
    example: "Authorization: Bearer eyJhbGciOi…",
    relatedTools: ["jwt-io"],
    relatedTerms: ["oauth", "stateless"],
  },
  {
    slug: "xss",
    term: "XSS",
    category: "Security",
    short: "Injecting scripts into a page other users load.",
    definition:
      "Cross-Site Scripting — when untrusted input ends up rendered as HTML/JavaScript, an attacker's script runs in victims' browsers and can steal sessions or act as them. Defense: escape output by default, sanitize rich input, and use a Content-Security-Policy.",
    relatedTerms: ["csrf", "csp"],
  },
  {
    slug: "csrf",
    term: "CSRF",
    category: "Security",
    short: "Tricking a victim's browser into sending authenticated requests.",
    definition:
      "Cross-Site Request Forgery — an attacker's page makes the victim's browser silently submit a request to another site where they're still logged in, abusing ambient cookie auth. Defenses: CSRF tokens, SameSite cookies and verifying Origin headers.",
    relatedTerms: ["xss"],
  },
  {
    slug: "csp",
    term: "CSP",
    category: "Security",
    short: "A browser-enforced allowlist of what a page may load and run.",
    definition:
      "Content Security Policy — response headers telling the browser which script, style and connection sources are legitimate. A strict policy is the strongest mitigation against XSS because injected inline scripts simply won't execute.",
    relatedTools: ["csp-evaluator", "security-headers"],
    relatedTerms: ["xss"],
  },
  {
    slug: "sql-injection",
    term: "SQL Injection",
    category: "Security",
    short: "User input rewritten as SQL — still a top breach vector.",
    definition:
      "Attacking an application by putting SQL syntax into input that gets concatenated into a query, letting the attacker read or modify data. The fix is parameterized queries (prepared statements), which every modern ORM and driver supports.",
    example: "' OR 1=1 -- in a login form bypasses the password check.",
    relatedTools: ["sqlmap"],
    relatedTerms: ["orm"],
  },

  // ── Programming Concepts ────────────────────────────────────────────────
  {
    slug: "design-pattern",
    term: "Design Pattern",
    category: "Programming Concepts",
    short: "Named, reusable solutions to recurring design problems.",
    definition:
      "Cataloged solutions to problems that recur across codebases — Observer, Factory, Strategy, Adapter and so on. Their real value is vocabulary: 'use a Strategy here' communicates an entire design in three words.",
    relatedTerms: ["solid", "dry"],
  },
  {
    slug: "solid",
    term: "SOLID",
    category: "Programming Concepts",
    short: "Five principles for object-oriented code that's easy to change.",
    definition:
      "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion — five principles that steer classes toward one clear job, small interfaces and depending on abstractions. A compass, not law; over-applying it breeds over-engineering.",
    relatedTerms: ["design-pattern", "dependency-injection"],
  },
  {
    slug: "dry",
    term: "DRY",
    category: "Programming Concepts",
    short: "Don't Repeat Yourself — every fact lives in one place.",
    definition:
      "The principle that every piece of knowledge should have a single authoritative representation in a system. Duplicated logic drifts when one copy changes. The counterweight: AHA ('avoid hasty abstractions') — three similar lines are better than one wrong abstraction.",
    relatedTerms: ["solid", "design-pattern"],
  },
  {
    slug: "dependency",
    term: "Dependency",
    category: "Programming Concepts",
    short: "External code your project needs to build or run.",
    definition:
      "Any third-party package your project relies on — direct ones you import, and transitive ones your dependencies import. Dependency management is choosing them deliberately, pinning versions and keeping them (and your attack surface) up to date.",
    relatedTools: ["npm", "pnpm", "yarn"],
    relatedTerms: ["semantic-versioning"],
  },
  {
    slug: "semantic-versioning",
    term: "Semantic Versioning",
    category: "Programming Concepts",
    short: "MAJOR.MINOR.PATCH — what each version bump promises.",
    definition:
      "A versioning convention: patch (1.2.3 → 1.2.4) is a bug fix, minor (1.2.3 → 1.3.0) adds features without breaking anything, major (1.2.3 → 2.0.0) allows breaking changes. Package managers use these ranges to decide when updates are safe.",
    relatedTerms: ["dependency"],
  },
  {
    slug: "static-vs-dynamic-typing",
    term: "Static vs Dynamic Typing",
    category: "Programming Concepts",
    short: "Types checked before running (compile time) or while running.",
    definition:
      "Statically typed languages (TypeScript, Rust, Go) check types when the code compiles, catching a class of bugs before deployment. Dynamically typed ones (Python, JavaScript) check at runtime, trading some safety for flexibility. Modern practice mixes both: type hints, gradual typing.",
    relatedTools: ["typescript"],
    relatedTerms: ["garbage-collection"],
  },
  {
    slug: "garbage-collection",
    term: "Garbage Collection",
    category: "Programming Concepts",
    short: "The runtime frees memory you stopped using, automatically.",
    definition:
      "Automatic memory management: the runtime tracks which objects are still reachable and reclaims the rest, removing manual free/delete. It's why most modern languages can't leak-by-forget (though they can still leak-by-hold) — and why systems languages like Rust ask who owns each value instead.",
    relatedTools: ["go", "rust"],
    relatedTerms: ["static-vs-dynamic-typing"],
  },

  // ── Testing ─────────────────────────────────────────────────────────────
  {
    slug: "tdd",
    term: "TDD",
    category: "Testing",
    short: "Write a failing test first, then the code that passes it.",
    definition:
      "Test-Driven Development — the red/green/refactor loop: write a small failing test, write the minimum code to pass, then clean up. Drives focused, testable design; coverage becomes a by-product rather than a goal.",
    relatedTerms: ["unit-test", "mocking"],
  },
  {
    slug: "unit-test",
    term: "Unit Test",
    category: "Testing",
    short: "Test one function or module in isolation.",
    definition:
      "Automated tests that exercise a small piece of code with controlled inputs, independent of the network and database (those get mocked). Fast enough to run on every save, they catch regressions at the source — the base of the testing pyramid, with integration and E2E tests above it.",
    relatedTools: ["vitest", "jest", "pytest", "junit"],
    relatedTerms: ["mocking", "tdd", "integration-test"],
  },
  {
    slug: "integration-test",
    term: "Integration Test",
    category: "Testing",
    short: "Test that pieces work together — real DB, real HTTP, no mocks.",
    definition:
      "Tests that verify multiple components cooperate correctly: a real (or containerized) database, actual request handling. Slower than unit tests but they catch what unit tests can't — mismatched assumptions between parts of the system.",
    relatedTools: ["testcontainers"],
    relatedTerms: ["unit-test", "e2e-test"],
  },
  {
    slug: "e2e-test",
    term: "E2E Test",
    category: "Testing",
    short: "Drive a real browser through a real user flow.",
    definition:
      "End-to-end tests automate a browser the way a user would — click here, fill that, expect this result — across the whole deployed stack. The slowest, flakiest, most valuable tier: they verify what users actually experience.",
    relatedTools: ["playwright", "cypress", "webdriverio"],
    relatedTerms: ["unit-test", "integration-test"],
  },
  {
    slug: "mocking",
    term: "Mocking",
    category: "Testing",
    short: "Replace real dependencies with controllable fakes in tests.",
    definition:
      "Substituting a dependency (HTTP client, database, clock) with a stand-in whose behavior the test controls and asserts on. Keeps unit tests fast and deterministic; over-mocking, though, produces tests that verify implementation instead of behavior.",
    relatedTools: ["msw", "wiremock", "mockoon"],
    relatedTerms: ["unit-test", "integration-test"],
  },
];

export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

export function glossaryByCategory(): Map<GlossaryCategory, GlossaryTerm[]> {
  const map = new Map<GlossaryCategory, GlossaryTerm[]>();
  for (const cat of GLOSSARY_CATEGORY_ORDER) {
    map.set(cat, GLOSSARY.filter((t) => t.category === cat));
  }
  return map;
}
