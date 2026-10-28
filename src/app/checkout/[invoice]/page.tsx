import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getProduct } from "@/lib/products";
import { formatIdr } from "@/lib/products";
import { dokuSimulationAllowed } from "@/lib/doku";
import { CheckoutStatus } from "@/components/checkout-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ invoice: string }>;
}) {
  const { invoice } = await params;
  const user = await getSessionUser();

  const rows = user
    ? await db
        .select()
        .from(orders)
        .where(and(eq(orders.invoiceNo, invoice), eq(orders.userId, user.id)))
        .limit(1)
    : [];
  const order = rows[0];
  const product = order ? getProduct(order.productId) : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      {!user ? (
        <div className="card mt-6 p-6 text-sm">
          <p>
            Silakan <a className="text-accent hover:underline" href={`/login?next=/checkout/${invoice}`}>login</a>{" "}
            dengan email yang Anda pakai saat checkout.
          </p>
        </div>
      ) : !order ? (
        <div className="card mt-6 p-6 text-sm">
          <p>Invoice tidak ditemukan untuk akun ini.</p>
        </div>
      ) : (
        <>
          <div className="card mt-6 p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Produk</span>
              <span className="font-semibold">{product?.name ?? order.productId}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatIdr(order.amount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <code className="font-mono text-xs">{order.invoiceNo}</code>
            </div>
          </div>
          <div className="mt-4">
            <CheckoutStatus
              invoice={order.invoiceNo}
              paymentUrl={order.paymentUrl}
              simulated={dokuSimulationAllowed()}
            />
          </div>
        </>
      )}
    </div>
  );
}
