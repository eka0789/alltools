import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { dokuConfig, fetchDokuOrderStatus } from "@/lib/doku";
import { finalizeOrderIfPaid } from "@/lib/entitlements";

export const runtime = "nodejs";

// GET /api/orders/[invoice] — status order milik sesi ini. Saat masih
// pending dan DOKU aktif, status juga ditanyakan langsung ke DOKU (pembayaran
// mungkin selesai tanpa webhook tiba dulu).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoice: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "login-required" }, { status: 401 });
  const { invoice } = await params;

  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.invoiceNo, invoice), eq(orders.userId, user.id)))
    .limit(1);
  const order = rows[0];
  if (!order) return Response.json({ error: "not-found" }, { status: 404 });

  if (order.status === "pending") {
    const config = dokuConfig();
    if (config) {
      const status = await fetchDokuOrderStatus(config, invoice, order.amount);
      if (status.status === "PAID") {
        await finalizeOrderIfPaid(order, status.raw || null);
        const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
        return Response.json({ status: "paid", order: fresh[0] });
      }
    }
    return Response.json({ status: "pending", order });
  }
  return Response.json({ status: order.status, order });
}
