import { NextRequest } from "next/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders, submissions, users } from "@/db/schema";
import { getAdminIdentity } from "@/lib/admin";
import { getCatalog } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cmd+K admin palette backend. Small, bounded result sets across the four
// entities operators look up most. Read-only.
export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity) return Response.json({ error: "unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return Response.json({ tools: [], submissions: [], orders: [], users: [] });
  }

  const catalog = getCatalog();
  const needle = q.toLowerCase();
  const tools = catalog.tools
    .filter(
      (tool) =>
        tool.name.toLowerCase().includes(needle) ||
        tool.slug.includes(needle) ||
        tool.url.toLowerCase().includes(needle),
    )
    .slice(0, 6)
    .map((tool) => ({
      id: tool.id,
      title: tool.name,
      subtitle: tool.categoryName,
      href: `/admin/tools/${tool.id}`,
    }));

  let submissionsResult: { id: number; title: string; subtitle: string; href: string }[] = [];
  let ordersResult: { id: number; title: string; subtitle: string; href: string }[] = [];
  let usersResult: { id: number; title: string; subtitle: string; href: string }[] = [];

  if (DB_ACTIVE) {
    try {
      const [subRows, orderRows, userRows] = await Promise.all([
        db
          .select({ id: submissions.id, name: submissions.name, url: submissions.url })
          .from(submissions)
          .where(
            and(
              eq(submissions.status, "pending"),
              or(
                like(submissions.name, `%${q}%`),
                like(submissions.url, `%${q}%`),
              ),
            ),
          )
          .orderBy(desc(submissions.createdAt))
          .limit(5),
        db
          .select({
            id: orders.id,
            invoiceNo: orders.invoiceNo,
            status: orders.status,
            email: users.email,
          })
          .from(orders)
          .innerJoin(users, eq(users.id, orders.userId))
          .where(
            or(
              like(orders.invoiceNo, `%${q.toUpperCase()}%`),
              like(users.email, `%${needle}%`),
            ),
          )
          .orderBy(desc(orders.createdAt))
          .limit(5),
        db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(like(users.email, `%${needle}%`))
          .orderBy(desc(users.createdAt))
          .limit(5),
      ]);
      submissionsResult = subRows.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.url,
        href: `/admin/submissions/${row.id}`,
      }));
      ordersResult = orderRows.map((row) => ({
        id: row.id,
        title: row.invoiceNo,
        subtitle: `${row.email} · ${row.status}`,
        href: `/admin/orders/${row.invoiceNo}`,
      }));
      usersResult = userRows.map((row) => ({
        id: row.id,
        title: row.email,
        subtitle: `user #${row.id}`,
        href: `/admin/users/${row.id}`,
      }));
    } catch {
      // partial results are fine
    }
  }

  return Response.json({
    tools,
    submissions: submissionsResult,
    orders: ordersResult,
    users: usersResult,
  });
}
