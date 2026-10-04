// Shared URL hygiene: only http(s) ever reaches a rendered href. This closes
// the `javascript:` vector that otherwise flows from submissions/admin forms
// into tool cards and chat tool rows.
export function safeHttpUrl(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Private-network targets the link checker must never fetch: an approved
// submission should not be able to turn our crawler into an SSRF probe of
// internal services or cloud metadata endpoints. Literal-host check — DNS
// rebinding (a public name resolving to a private IP) is out of scope here
// and covered only by running the checker in CI, away from private networks.
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "metadata.google.internal" || host === "169.254.169.254") return true;
  // IPv6 loopback, unspecified, link-local (fe80::/10), unique-local (fc00::/7)
  // and IPv4-mapped literals.
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("::ffff:")) return isPrivateHost(host.slice(7));
    return false;
  }
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}
