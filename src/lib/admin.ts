import { cookies } from "next/headers";

export const ADMIN_COOKIE = "at_admin";

export function adminToken(): string {
  return process.env.ADMIN_TOKEN ?? "alltools-admin";
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}
