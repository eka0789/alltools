import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/data";
import { lookupRedirect } from "@/lib/redirects";

// HTTP-level permanent redirects for tool slugs changed by an admin. RSC
// `redirect()` during a streamed render emits a 200 + meta refresh, which is a
// soft redirect for crawlers; the proxy runs before rendering and can answer
// with a real 301.
//
// Known tool slugs short-circuit via the in-memory catalog (no DB hit). Only
// unknown slugs — the ones that may redirect — touch the redirects table.
export const config = {
  matcher: ["/tools/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Only the exact /tools/<slug> shape; /tools/<slug>/anything falls through.
  if (!/^\/tools\/[^/]+$/.test(pathname)) return NextResponse.next();

  const slug = pathname.slice("/tools/".length);
  try {
    if (getCatalog().bySlug.has(slug)) return NextResponse.next();
  } catch {
    // fall through to the redirect lookup
  }

  const target = await lookupRedirect(pathname);
  if (target) {
    return NextResponse.redirect(new URL(target, request.url), 301);
  }
  return NextResponse.next();
}
