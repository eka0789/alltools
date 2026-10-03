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
