import { NextRequest } from "next/server";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import {
  adminAudit,
  aiUsage,
  coupons,
  entitlements,
  feedback,
  orders,
  searchQueries,
  subscribers,
  teamMembers,
  teams,
  toolClicks,
  users,
} from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { csvResponse, toCsv, type CsvValue } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORTS = new Set([
  "tools",
  "orders",
  "subscribers",
  "coupons",
  "feedback",
  "searches",
  "clicks",
  "users",
  "user",
  "audit",
]);

const OWNER_ONLY = new Set(["orders", "users", "user", "audit"]);

// GET /admin/export?type=tools — CSV download for operators. Bounded rows so
// a large table can't tie up a serverless/PM2 request; the dataset is small
// and this is an ops convenience, not an analytics warehouse.
export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity) return new Response("Unauthorized", { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "";
  if (!EXPORTS.has(type)) return new Response("Unknown export type", { status: 400 });
  if (OWNER_ONLY.has(type) && !roleCan(identity.role, "billing")) {
    return new Response("Forbidden", { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "tools") {
    const catalog = getCatalog();
    const rows: CsvValue[][] = catalog.tools.map((t) => [
      t.name,
      t.slug,
      t.url,
      t.categoryName,
      t.subcategoryName ?? "",
      t.pricing,
      t.status,
      t.featured ? "yes" : "no",
      t.verified ? "yes" : "no",
      t.openSource ? "yes" : "no",
      t.selfHosted ? "yes" : "no",
      t.githubUrl ?? "",
      t.documentationUrl ?? "",
      t.installCommand ?? "",
      t.tags.join("|"),
      t.clicks,
      t.weeklyClicks,
      new Date(t.createdAt).toISOString(),
    ]);
    return csvResponse(
      `tools-${stamp}.csv`,
      toCsv(
        [
          "name",
          "slug",
          "url",
          "category",
          "subcategory",
          "pricing",
          "status",
          "featured",
          "verified",
          "open_source",
          "self_hosted",
          "github_url",
          "docs_url",
          "install_command",
          "tags",
          "clicks",
          "weekly_clicks",
          "created_at",
        ],
        rows,
      ),
    );
  }

  if (!DB_ACTIVE) {
    return csvResponse(`${type}-${stamp}.csv`, toCsv(["empty"], [["database unavailable"]]));
  }

  if (type === "user") {
    // GDPR data export: everything we store about one user.
    const id = Number(req.nextUrl.searchParams.get("id") ?? 0);
    if (!id) return new Response("Missing id", { status: 400 });
    const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!userRows[0]) return new Response("Not found", { status: 404 });

    const [orderRows, entitlementRows, memberRows, aiRows] = await Promise.all([
      db.select().from(orders).where(eq(orders.userId, id)),
      db.select().from(entitlements).where(eq(entitlements.userId, id)),
      db
        .select({ teamId: teamMembers.teamId, role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.userId, id)),
      db.select({ n: sql<number>`count(*)` }).from(aiUsage).where(eq(aiUsage.userId, id)),
    ]);
    const teamIds = memberRows.map((m) => m.teamId);
    const teamRows =
      teamIds.length > 0
        ? await db.select().from(teams).where(inArray(teams.id, teamIds))
        : [];

    const payload = {
      exportedAt: new Date().toISOString(),
      user: userRows[0],
      orders: orderRows,
      entitlements: entitlementRows,
      teams: teamRows,
      teamRoles: memberRows,
      aiUsageCount: Number(aiRows[0]?.n ?? 0),
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="user-${id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (type === "orders") {
    const rows = await db
      .select({
        invoiceNo: orders.invoiceNo,
        productId: orders.productId,
        email: users.email,
        amount: orders.amount,
        discountAmount: orders.discountAmount,
        couponCode: orders.couponCode,
        status: orders.status,
        provider: orders.provider,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt))
      .limit(5000);
    return csvResponse(
      `orders-${stamp}.csv`,
      toCsv(
        ["invoice", "product", "email", "amount_idr", "discount_idr", "coupon", "status", "provider", "created_at", "paid_at"],
        rows.map((o) => [
          o.invoiceNo,
          o.productId,
          o.email,
          o.amount,
          o.discountAmount,
          o.couponCode ?? "",
          o.status,
          o.provider,
          iso(o.createdAt),
          iso(o.paidAt),
        ]),
      ),
    );
  }

  if (type === "subscribers") {
    const rows = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(5000);
    return csvResponse(
      `subscribers-${stamp}.csv`,
      toCsv(
        ["email", "status", "created_at", "confirmed_at", "unsubscribed_at"],
        rows.map((s) => [
          s.email,
          s.unsubscribedAt ? "unsubscribed" : s.confirmedAt ? "confirmed" : "pending",
          iso(s.createdAt),
          iso(s.confirmedAt),
          iso(s.unsubscribedAt),
        ]),
      ),
    );
  }

  if (type === "coupons") {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(2000);
    return csvResponse(
      `coupons-${stamp}.csv`,
      toCsv(
        ["code", "type", "value", "min_amount_idr", "used", "max_uses", "expires_at", "active", "created_at"],
        rows.map((c) => [
          c.code,
          c.discountType,
          c.discountValue,
          c.minAmountIdr,
          c.usedCount,
          c.maxUses ?? "",
          iso(c.expiresAt),
          c.active ? "yes" : "no",
          iso(c.createdAt),
        ]),
      ),
    );
  }

  if (type === "feedback") {
    const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(5000);
    return csvResponse(
      `feedback-${stamp}.csv`,
      toCsv(
        ["id", "tool_slug", "type", "status", "message", "created_at", "resolved_at"],
        rows.map((f) => [f.id, f.toolSlug, f.type, f.status, f.message, iso(f.createdAt), iso(f.resolvedAt)]),
      ),
    );
  }

  if (type === "searches") {
    const since = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const rows = await db
      .select()
      .from(searchQueries)
      .where(gte(searchQueries.createdAt, since))
      .orderBy(desc(searchQueries.createdAt))
      .limit(5000);
    return csvResponse(
      `searches-${stamp}.csv`,
      toCsv(
        ["query", "result_count", "created_at"],
        rows.map((s) => [s.query, s.resultCount, iso(s.createdAt)]),
      ),
    );
  }

  if (type === "clicks") {
    const catalog = getCatalog();
    const rows = await db
      .select()
      .from(toolClicks)
      .orderBy(desc(toolClicks.weeklyClicks), desc(toolClicks.clicks))
      .limit(5000);
    return csvResponse(
      `clicks-${stamp}.csv`,
      toCsv(
        ["slug", "name", "clicks", "weekly_clicks", "week_start", "updated_at"],
        rows.map((c) => [
          c.slug,
          catalog.bySlug.get(c.slug)?.name ?? "",
          c.clicks,
          c.weeklyClicks,
          iso(c.weekStart),
          iso(c.updatedAt),
        ]),
      ),
    );
  }

  if (type === "users") {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(5000);
    return csvResponse(
      `users-${stamp}.csv`,
      toCsv(
        ["id", "email", "created_at"],
        rows.map((u) => [u.id, u.email, iso(u.createdAt)]),
      ),
    );
  }

  // audit
  const rows = await db.select().from(adminAudit).orderBy(desc(adminAudit.createdAt)).limit(5000);
  return csvResponse(
    `audit-${stamp}.csv`,
    toCsv(
      ["id", "actor", "action", "target", "detail", "created_at"],
      rows.map((a) => [a.id, a.actor, a.action, a.target, a.detail, iso(a.createdAt)]),
    ),
  );
}

function iso(ms: number | null | undefined): string {
  return ms ? new Date(ms).toISOString() : "";
}
