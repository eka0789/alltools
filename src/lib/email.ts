// Shared Resend email delivery. Fail-closed: without RESEND_API_KEY every
// send reports an error and callers degrade gracefully (dev shows the magic
// link in-app; production disables login/newsletter with clear messages).

export interface SendResult {
  ok: boolean;
  error?: string;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, error: "email-not-configured" };
  const from = process.env.RESEND_FROM?.trim() || "AllTools <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[email] resend error", res.status, await res.text().catch(() => ""));
      return { ok: false, error: `resend-${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Shared email shell — plain, honest, dark-mode-friendly.
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
      <img src="${siteUrl()}/logo.png" alt="AllTools" width="32" height="22" style="vertical-align:middle;border:0;display:inline-block;" />
      <span style="font-weight:600;margin-left:8px;color:#18181b;vertical-align:middle;">AllTools</span>
    </div>
    <div style="padding:24px;color:#18181b;font-size:14px;line-height:1.6;">
      <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
      AllTools — The Developer Dictionary · <a href="${siteUrl()}" style="color:#4f46e5;">alldevtools.vercel.app</a>
    </div>
  </div>
</body></html>`;
}

export function actionButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${label}</a>
  <p style="color:#71717a;font-size:12px;">Or paste this link in your browser:<br><a href="${url}" style="color:#4f46e5;word-break:break-all;">${url}</a></p>`;
}
