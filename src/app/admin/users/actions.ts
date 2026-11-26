"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { entitlements, users } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";

async function requireBilling() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
}

export async function grantProToUserAction(formData: FormData) {
  await requireBilling();
  const userId = Number(formData.get("userId") ?? 0);
  if (!userId) redirect("/admin/users?error=not_found");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!rows[0]) redirect("/admin/users?error=not_found");

  await db.insert(entitlements).values({
    userId,
    productId: "pro_all",
    createdAt: Date.now(),
  });
  await logAudit("entitlement.grant", `user:${rows[0].email}`, "Granted Pro Lifetime via user manager");
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=granted");
}

export async function revokeUserEntitlementsAction(formData: FormData) {
  await requireBilling();
  const userId = Number(formData.get("userId") ?? 0);
  const productId = String(formData.get("productId") ?? "").trim();
  if (!userId) redirect("/admin/users?error=not_found");

  const conditions = [eq(entitlements.userId, userId), isNull(entitlements.revokedAt)];
  if (productId) conditions.push(eq(entitlements.productId, productId));
  await db
    .update(entitlements)
    .set({ revokedAt: Date.now() })
    .where(and(...conditions));

  await logAudit(
    "entitlement.revoke",
    `user:${userId}`,
    productId ? `Revoked ${productId}` : "Revoked all active entitlements",
  );
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=revoked");
}
