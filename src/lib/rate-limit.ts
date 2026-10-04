// Fixed-window in-memory rate limiter. On serverless this is per instance,
// so it is not a global budget — but it blunts bursts and abusive loops at
// zero cost, which is the realistic threat for a directory site.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Opportunistic cleanup so the map cannot grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  // Trust model: on Vercel, x-vercel-forwarded-for-ip and x-forwarded-for are
  // set at the edge and client-supplied values are discarded — safe to use.
  // On hosts without an edge proxy a client could spoof either header, so
  // rate limits there are best-effort (as documented in the README).
  const vercel = req.headers.get("x-vercel-forwarded-for-ip");
  if (vercel) return vercel.split(",")[0].trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
