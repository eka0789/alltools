import { createHmac, createHash, randomUUID } from "crypto";

// ── DOKU Checkout API v1 ─────────────────────────────────────────────────
// Endpoint dokumen resmi DOKU ("Checkout API v1"): signature = HMAC-SHA256
// (base64) atas clientId + requestId + timestamp + requestTarget + sha256hex
// (raw body). Tanpa kredensial, modul melaporkan configured=false dan
// checkout API hanya mengizinkan simulasi di luar produksi.

export interface DokuConfig {
  clientId: string;
  secretKey: string;
  baseUrl: string; // https://api.sandbox.doku.com | https://api.doku.com
}

export interface DokuLineItem {
  name: string;
  price: number; // IDR
  quantity: number;
}

export function dokuConfig(): DokuConfig | null {
  const clientId = process.env.DOKU_CLIENT_ID?.trim() ?? "";
  const secretKey = process.env.DOKU_SECRET_KEY?.trim() ?? "";
  if (!clientId || !secretKey) return null;
  const env = process.env.DOKU_ENV?.trim().toLowerCase() === "production" ? "production" : "sandbox";
  const baseUrl = env === "production" ? "https://api.doku.com" : "https://api.sandbox.doku.com";
  return { clientId, secretKey, baseUrl };
}

export function dokuConfigured(): boolean {
  return dokuConfig() !== null;
}

// Simulasi hanya boleh di luar produksi: tombol "Bayar (simulasi)" memicu
// webhook internal sehingga seluruh alur order→entitlement teruji end-to-end.
export function dokuSimulationAllowed(): boolean {
  return !dokuConfigured() && process.env.NODE_ENV !== "production";
}

function timestampJakarta(): string {
  // DOKU menerima ISO-8601 dengan offset. Gunakan +07:00 (WIB).
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${now.toISOString().slice(0, 19)}+07:00`;
}

function bodyHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function hmacSignature(config: DokuConfig, stringToSign: string): string {
  return createHmac("sha256", config.secretKey).update(stringToSign).digest("base64");
}

interface DokuHeaders {
  "Client-Id": string;
  "Request-Id": string;
  "Request-Timestamp": string;
  Signature: string;
}

function buildHeaders(
  config: DokuConfig,
  requestTarget: string,
  rawBody: string,
): Record<string, string> {
  const requestId = randomUUID();
  const ts = timestampJakarta();
  const stringToSign = `${config.clientId}${requestId}${ts}${requestTarget}${bodyHash(rawBody)}`;
  return {
    "Client-Id": config.clientId,
    "Request-Id": requestId,
    "Request-Timestamp": ts,
    Signature: `HMACSHA256=${hmacSignature(config, stringToSign)}`,
  };
}

// Signature yang valid untuk notifikasi/redirect masuk dari DOKU. DOKU
// mengirim beberapa varian format antar-versi; kita uji kandidat yang
// terdokumentasi (dengan dan tanpa requestTarget) terhadap raw body.
export function verifyDokuSignature(
  config: DokuConfig,
  headers: {
    "client-id"?: string;
    "request-id"?: string;
    "request-timestamp"?: string;
    "request-date"?: string;
    signature?: string;
    "x-signature"?: string;
  },
  requestTarget: string,
  rawBody: string,
): boolean {
  const given = (headers.signature ?? headers["x-signature"] ?? "").replace(/^HMACSHA256=/, "");
  if (!given) return false;
  const ts = headers["request-timestamp"] ?? headers["request-date"] ?? "";
  const clientId = headers["client-id"] ?? "";
  if (!clientId || !ts) return false;
  const digest = bodyHash(rawBody);
  const candidates = [
    `${clientId}${headers["request-id"]}${ts}${digest}`,
    `${clientId}${headers["request-id"]}${ts}${requestTarget}${digest}`,
  ];
  return candidates.some(
    (c) => hmacSignature(config, c) === given,
  );
}

export interface DokuCheckoutRequest {
  invoiceNumber: string;
  amount: number; // IDR
  customer: { name: string; email: string };
  lineItems: DokuLineItem[];
}

export interface DokuCheckoutResult {
  ok: boolean;
  paymentUrl?: string;
  error?: string;
}

export async function createDokuPayment(
  config: DokuConfig,
  req: DokuCheckoutRequest,
): Promise<DokuCheckoutResult> {
  const body = JSON.stringify({
    order: {
      invoice_number: req.invoiceNumber,
      amount: req.amount,
      line_items: req.lineItems,
    },
    customer: {
      name: req.customer.name,
      email: req.customer.email,
    },
  });
  const headers = buildHeaders(config, "/checkout/v1/payment", body);
  try {
    const res = await fetch(`${config.baseUrl}/checkout/v1/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[doku] checkout error", res.status, text.slice(0, 500));
      return { ok: false, error: `doku-${res.status}` };
    }
    // Respons Checkout v1 menaruh URL pembayaran di payment.url (beberapa
    // versi memakai payment_page_url / response.payment.url — parse toleran).
    let paymentUrl: string | undefined;
    try {
      const data = JSON.parse(text) as {
        payment?: { url?: string };
        payment_page_url?: string;
        response?: { payment?: { url?: string } };
      };
      paymentUrl = data.payment?.url ?? data.payment_page_url ?? data.response?.payment?.url;
    } catch {
      paymentUrl = undefined;
    }
    if (!paymentUrl) {
      console.error("[doku] checkout response without payment url", text.slice(0, 500));
      return { ok: false, error: "doku-no-payment-url" };
    }
    return { ok: true, paymentUrl };
  } catch {
    return { ok: false, error: "doku-network" };
  }
}

export type DokuStatus = "PAID" | "PENDING" | "EXPIRED" | "FAILED" | "UNKNOWN";

// Cek status order di DOKU (sumur kebenaran) — dipakai oleh halaman sukses
// dan sebagai fallback jika signature webhook tidak dapat diverifikasi.
export async function fetchDokuOrderStatus(
  config: DokuConfig,
  invoiceNumber: string,
  amount: number,
): Promise<{ status: DokuStatus; raw: string }> {
  const requestTarget = `/orders/v1/status/${encodeURIComponent(invoiceNumber)}?amount=${amount}`;
  const headers = buildHeaders(config, requestTarget, "");
  try {
    const res = await fetch(`${config.baseUrl}${requestTarget}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await res.text();
    if (!res.ok) return { status: "UNKNOWN", raw };
    let status: DokuStatus = "UNKNOWN";
    try {
      const data = JSON.parse(raw) as {
        transaction?: { status?: string };
        transaction_status?: string;
        order?: { status?: string };
      };
      const s = (data.transaction?.status ?? data.transaction_status ?? data.order?.status ?? "").toUpperCase();
      if (["PAID", "COMPLETED", "SUCCESS", "FINISH"].includes(s)) status = "PAID";
      else if (["EXPIRED", "CANCELED", "CANCELLED"].includes(s)) status = "EXPIRED";
      else if (["FAILED", "DENIED"].includes(s)) status = "FAILED";
      else if (s) status = "PENDING";
    } catch {
      // raw diawetkan untuk debug
    }
    return { status, raw };
  } catch {
    return { status: "UNKNOWN", raw: "" };
  }
}
