import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Box"),
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
  status: text("status").notNull().default("pending"), // pending | approved | rejected
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

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type LinkCheck = typeof linkChecks.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type ToolClick = typeof toolClicks.$inferSelect;
