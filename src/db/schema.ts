import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Box"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  homeOrder: integer("home_order"), // position on homepage grid, null = not on homepage
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subcategories = sqliteTable(
  "subcategories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    slug: text("slug").notNull(), // unique within its category
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("subcategories_category_slug_idx").on(t.categoryId, t.slug)],
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const tools = sqliteTable(
  "tools",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    url: text("url").notNull(),
    description: text("description").notNull(),
    logo: text("logo"), // domain used to resolve a favicon
    installCommand: text("install_command"), // official one-liner, shown with a copy button
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    subcategoryId: integer("subcategory_id").references(() => subcategories.id),
    // JSON-encoded string arrays (v1 keeps these denormalized; see README)
    tags: text("tags").notNull().default("[]"),
    pricing: text("pricing").notNull().default("free"), // free | freemium | paid
    openSource: integer("open_source", { mode: "boolean" })
      .notNull()
      .default(false),
    selfHosted: integer("self_hosted", { mode: "boolean" })
      .notNull()
      .default(false),
    githubUrl: text("github_url"),
    documentationUrl: text("documentation_url"),
    platforms: text("platforms").notNull().default("[]"), // web | desktop | cli | mobile | extension
    languages: text("languages").notNull().default("[]"),
    frameworks: text("frameworks").notNull().default("[]"),
    useCases: text("use_cases").notNull().default("[]"),
    // Editorial decision aid: honest strengths and trade-offs (top tools).
    pros: text("pros").notNull().default("[]"),
    cons: text("cons").notNull().default("[]"),
    alternatives: text("alternatives").notNull().default("[]"), // tool slugs
    relatedTools: text("related_tools").notNull().default("[]"), // tool slugs
    status: text("status").notNull().default("active"), // active | needs_review | deprecated
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    lastVerifiedAt: integer("last_verified_at"), // unix ms
    popularity: integer("popularity"), // intentionally null until objective data exists
    // Objective GitHub signals, filled by scripts/fetch-github-stats.mjs
    // (never invented — stays null until real data lands).
    githubStars: integer("github_stars"),
    githubPushedAt: integer("github_pushed_at"), // unix ms of last push
    githubLicense: text("github_license"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    featuredOrder: integer("featured_order"), // editorial ordering on the homepage
    // Soft delete: the admin "Delete" action moves a tool to the trash
    // instead of destroying it. Public catalog builders skip these rows;
    // /admin/tools/trash can restore or purge them.
    deletedAt: integer("deleted_at"),
    // Link-health workflow: an ignored URL is hidden from the flagged list
    // and skipped by automated checks; recheckAfter defers the next check
    // until a chosen timestamp (admin "Recheck later").
    linkIgnoredAt: integer("link_ignored_at"),
    recheckAfter: integer("recheck_after"),
    // Scheduled publishing: future timestamp hides the tool from the public
    // catalog until then; admins still see it with a "scheduled" badge.
    publishAt: integer("publish_at"),
    // Optional SEO overrides. Empty = generated defaults.
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoNoindex: integer("seo_noindex", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("tools_category_idx").on(t.categoryId),
    index("tools_status_idx").on(t.status),
    uniqueIndex("tools_url_unique").on(t.url),
  ],
);

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull(),
  categorySlug: text("category_slug").notNull(),
  githubUrl: text("github_url"),
  documentationUrl: text("documentation_url"),
  pricing: text("pricing").notNull().default("free"),
  tags: text("tags").notNull().default("[]"),
  status: text("status").notNull().default("pending"), // pending | reviewing | approved | rejected
  rejectionReason: text("rejection_reason"), // internal note when rejected
  submitterEmail: text("submitter_email"), // optional — used to notify the submitter
  assignedTo: text("assigned_to"), // admin name handling the review
  internalNotes: text("internal_notes"),
  createdAt: integer("created_at").notNull(),
  reviewedAt: integer("reviewed_at"),
});

export const linkChecks = sqliteTable(
  "link_checks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    toolId: integer("tool_id")
      .notNull()
      .references(() => tools.id),
    url: text("url").notNull(),
    httpStatus: integer("http_status"),
    ok: integer("ok", { mode: "boolean" }).notNull(),
    responseTimeMs: integer("response_time_ms"),
    error: text("error"),
    checkedAt: integer("checked_at").notNull(),
  },
  (t) => [index("link_checks_tool_idx").on(t.toolId)],
);

// Community reports from the "Report broken link / suggest edit" affordance
// on tool pages. Reviewed in the admin dashboard.
export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  toolSlug: text("tool_slug").notNull(),
  type: text("type").notNull(), // broken_link | edit_suggestion
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("open"), // open | resolved | dismissed
  assignedTo: text("assigned_to"),
  internalNotes: text("internal_notes"),
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at"),
});

// Aggregate outbound-click counters per tool slug, written by the tracking
// endpoint when visitors open a tool's website. Seeds never touch this —
// it is pure runtime signal. `weeklyClicks` is a lazy 7-day bucket: the
// click endpoint resets it whenever weekStart is older than 7 days, so
// "popular this week" needs no cron.
export const toolClicks = sqliteTable("tool_clicks", {
  slug: text("slug").primaryKey(),
  clicks: integer("clicks").notNull().default(0),
  weeklyClicks: integer("weekly_clicks").notNull().default(0),
  weekStart: integer("week_start"), // unix ms when the current 7-day bucket began
  updatedAt: integer("updated_at").notNull(),
});

// Anonymous search-query log. Powers trending searches and — more
// importantly — shows which queries return zero results, which is the
// cheapest curation signal a directory can have. No IPs, no sessions,
// only the normalized query text, its result count and a timestamp.
export const searchQueries = sqliteTable(
  "search_queries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    query: text("query").notNull(), // trimmed, lowercased, max 100 chars
    resultCount: integer("result_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("search_queries_created_idx").on(t.createdAt),
    index("search_queries_query_idx").on(t.query),
  ],
);

// ── Accounts (passwordless, email magic-link) ───────────────────────────
// Favorites/compare sync across devices. No passwords are stored anywhere:
// a magic link proves email ownership, sessions are opaque random tokens
// whose sha256 digests live in the DB (mirroring the admin cookie pattern).

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // sha256 of the cookie token
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// Single-use magic-link tokens (sha256 hashed, 15-minute TTL).
export const authTokens = sqliteTable("auth_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});

// Everything a signed-in user syncs, one row per user (JSON columns keep
// the shape flexible — the client owns ordering and caps).
export const userLists = sqliteTable("user_lists", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  favorites: text("favorites").notNull().default("[]"), // JSON string[]
  compare: text("compare").notNull().default("[]"), // JSON string[]
  updatedAt: integer("updated_at").notNull(),
});

// ── Newsletter (double opt-in, Resend delivery) ─────────────────────────
export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(), // confirm + unsubscribe link token
  confirmedAt: integer("confirmed_at"),
  unsubscribedAt: integer("unsubscribed_at"),
  createdAt: integer("created_at").notNull(),
});

// ── AktifKoding Pro: monetization ────────────────────────────────────────
// Products are static in src/lib/products.ts (code-defined catalog — no
// admin CRUD needed); orders/entitlements record what a user bought and
// what they may use. DOKU payments land here via the webhook.

// One row per checkout attempt. status: pending | paid | expired | failed.
// Amount stored in whole rupiah (IDR has no minor units in practice).
export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceNo: text("invoice_no").notNull().unique(), // AK-YYYYMMDD-xxxx
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(), // key in src/lib/products.ts
    amount: integer("amount").notNull(), // IDR (net paid after discount)
    couponCode: text("coupon_code"),
    discountAmount: integer("discount_amount").notNull().default(0),
    status: text("status").notNull().default("pending"),
    provider: text("provider").notNull().default("doku"),
    paymentUrl: text("payment_url"), // DOKU payment page redirect
    paidAt: integer("paid_at"),
    // Raw DOKU notification payload for reconciliation/audit.
    providerPayload: text("provider_payload"),
    // Partial refunds: net revenue = amount - refundedAmount.
    refundedAmount: integer("refunded_amount").notNull().default(0),
    refundReason: text("refund_reason"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

// What a user may access. product_id is either the product key or the
// wildcard "pro_all" (lifetime). Team purchases create one row per seat.
export const entitlements = sqliteTable(
  "entitlements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(), // product key or "pro_all"
    orderId: integer("order_id").references(() => orders.id),
    teamId: integer("team_id").references(() => teams.id),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (t) => [index("entitlements_user_idx").on(t.userId, t.productId)],
);

// Teams: a Team purchase creates one team; the buyer is the owner.
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ownerUserId: integer("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seats: integer("seats").notNull().default(5),
  createdAt: integer("created_at").notNull(),
});

// Membership join table. role: owner | member. The owner seat counts toward
// seats.
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("team_members_unique").on(t.teamId, t.userId)],
);

// AI code-review usage for quota enforcement. One row per review request;
// anonymous users get a cookie anon id (no user row).
export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    anonId: text("anon_id"), // cookie id when not signed in
    kind: text("kind").notNull().default("review"), // review | docs_ai
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("ai_usage_user_idx").on(t.userId, t.createdAt),
    index("ai_usage_anon_idx").on(t.anonId, t.createdAt),
  ],
);

// Pending team invites: owner adds an email; when that email first signs in
// the invite is auto-accepted (redeemMagicToken → acceptTeamInvites) and a
// teamMembers row is created.
export const teamInvites = sqliteTable(
  "team_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: integer("created_at").notNull(),
    acceptedAt: integer("accepted_at"),
  },
  (t) => [index("team_invites_email_idx").on(t.email), index("team_invites_team_idx").on(t.teamId)],
);

// Promo / voucher coupons managed from /admin and validated at checkout.
export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // uppercase trimmed, e.g. LAUNCH20
  discountType: text("discount_type").notNull().default("percent"), // percent | fixed
  discountValue: integer("discount_value").notNull(), // 1-95 for percent, IDR for fixed
  minAmountIdr: integer("min_amount_idr").notNull().default(0),
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"), // unix ms, null = never expires
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
});

// Shareable public stacks created by users from /stacks/custom or /favorites.
export const sharedStacks = sqliteTable("shared_stacks", {
  id: text("id").primaryKey(), // short url-safe slug
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  slugs: text("slugs").notNull().default("[]"), // JSON string[] of tool slugs
  authorLabel: text("author_label"), // optional display name (never raw email)
  views: integer("views").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

// Persistent fixed-window rate-limit buckets (survives restarts & shared across
// serverless instances when backed by Turso).
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  resetAt: integer("reset_at").notNull(),
});

// ── Admin operations ────────────────────────────────────────────────────
// Audit trail: one row per mutating admin action. Shows who did what when —
// the admin login itself stays passwordless (token based), so this table is
// the only record of operator activity.
export const adminAudit = sqliteTable(
  "admin_audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actor: text("actor").notNull(), // "<role>:<name>" from the matched admin token
    action: text("action").notNull(), // e.g. tools.bulk, order.mark_paid
    target: text("target").notNull().default(""), // e.g. order:AK-20260101-AB12
    detail: text("detail").notNull().default(""), // short human-readable summary
    beforeJson: text("before_json"), // snapshot before a mutation (rollback support)
    afterJson: text("after_json"), // snapshot after a mutation
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("admin_audit_created_idx").on(t.createdAt)],
);

// Key/value site settings toggled from /admin/settings (feature flags,
// checkout switch, announcement). Values are plain strings.
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Cron/background job history. Written by the cron routes (and manual ops
// actions) so the Ops center can show the last run and surface silent
// failures instead of waiting for someone to notice.
export const jobRuns = sqliteTable(
  "job_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    job: text("job").notNull(), // check-links | reconcile-orders | weekly-digest | github-stats
    status: text("status").notNull().default("running"), // running | success | failed | skipped
    summary: text("summary").notNull().default(""),
    error: text("error"),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
  },
  (t) => [index("job_runs_job_idx").on(t.job, t.startedAt)],
);

// Permanent redirects recorded when a tool slug changes (SEO safety) plus
// manually managed entries from /admin/redirects. Served by the tool page
// fallback: unknown slug -> 308 to the recorded target.
export const redirects = sqliteTable("redirects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  hits: integer("hits").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

// Admin notification center. Written by notifyAdmin() on business events
// (new submission/report/order, cron failures). Optional webhook mirrors the
// same message to Telegram/Slack.
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("info"), // info | warning | success
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link"),
    createdAt: integer("created_at").notNull(),
    readAt: integer("read_at"),
  },
  (t) => [index("notifications_created_idx").on(t.createdAt)],
);

// Order status timeline (created/paid/refunded/cancelled). Complements the
// two timestamps on the order row and powers the admin order detail view.
export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

// Admin-editable product overrides (price, scheduled promo, active flag).
// Merged over the code-defined catalog in src/lib/products.ts so prices can
// change without a deploy while the base definitions remain the fallback.
export const productOverrides = sqliteTable("product_overrides", {
  productId: text("product_id").primaryKey(),
  name: text("name"),
  priceIdr: integer("price_idr"),
  promoPriceIdr: integer("promo_price_idr"),
  promoStartsAt: integer("promo_starts_at"),
  promoEndsAt: integer("promo_ends_at"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at").notNull(),
});

// Daily aggregate impressions per tool. Written by the client-side
// /api/track-view beacon (real page views, not prefetches). CTR = clicks /
// impressions; shelf-ware = many impressions, zero clicks.
export const toolImpressions = sqliteTable(
  "tool_impressions",
  {
    slug: text("slug").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.slug, t.day] })],
);

// Marketing campaigns sent from the admin. Body is plain text rendered inside
// the shared email shell; optional CTA gets click tracking. Opens/clicks land
// in email_events.
export const emailCampaigns = sqliteTable("email_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  body: text("body").notNull().default(""),
  segment: text("segment").notNull().default("subscribers"), // subscribers | users | pro
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  status: text("status").notNull().default("draft"), // draft | scheduled | sending | sent | failed
  scheduledAt: integer("scheduled_at"),
  sentAt: integer("sent_at"),
  recipients: integer("recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const emailEvents = sqliteTable(
  "email_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    type: text("type").notNull(), // open | click
    url: text("url"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("email_events_unique").on(t.campaignId, t.email, t.type)],
);

// Server-side admin sessions. The cookie carries `s.<raw token>`; only the
// sha256 lives here, enabling session listing and forced logout. Legacy
// token-digest cookies keep working (see lib/admin.ts).
export const adminSessions = sqliteTable("admin_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  actor: text("actor").notNull(),
  role: text("role").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
});

// Four-eyes approvals for sensitive money/price actions. Enabled per kind via
// ADMIN_REQUIRE_APPROVAL (e.g. "refund,price"); a different admin must approve.
export const approvals = sqliteTable(
  "approvals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(), // refund | price
    target: text("target").notNull(),
    payload: text("payload").notNull().default("{}"),
    summary: text("summary").notNull().default(""),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    requestedBy: text("requested_by").notNull(),
    decidedBy: text("decided_by"),
    decidedAt: integer("decided_at"),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("approvals_status_idx").on(t.status, t.createdAt)],
);

// DB-backed editorial collections merged over src/data/collections.ts.
export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("📦"),
  tools: text("tools").notNull().default("[]"), // JSON string[] of tool slugs
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// DB-backed glossary terms merged over src/data/glossary.ts.
export const glossaryTerms = sqliteTable("glossary_terms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  term: text("term").notNull(),
  category: text("category").notNull(),
  short: text("short").notNull(),
  definition: text("definition").notNull(),
  example: text("example"),
  relatedTools: text("related_tools").notNull().default("[]"),
  relatedTerms: text("related_terms").notNull().default("[]"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type LinkCheck = typeof linkChecks.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type ToolClick = typeof toolClicks.$inferSelect;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type UserList = typeof userLists.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type AiUsage = typeof aiUsage.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type SharedStack = typeof sharedStacks.$inferSelect;
export type RateLimitRow = typeof rateLimits.$inferSelect;
export type AdminAudit = typeof adminAudit.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
export type Redirect = typeof redirects.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type ProductOverride = typeof productOverrides.$inferSelect;
export type ToolImpression = typeof toolImpressions.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type GlossaryTermRow = typeof glossaryTerms.$inferSelect;
