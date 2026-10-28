import { createHmac, createHash, randomUUID, timingSafeEqual } from "crypto";

// ── DOKU Checkout API v1 (Non-SNAP) ──────────────────────────────────────
// Format sesuai docs resmi developers.doku.com:
// - Base URL sandbox: https://api-sandbox.doku.com  (dengan tanda hubung!)
// - Request-Timestamp: ISO8601 UTC ("2020-08-11T08:45:42Z")
// - Signature (POST): baris "Client-Id:..\nRequest-Id:..\nRequest-Timestamp:..
//   \nRequest-Target:..\nDigest:<base64(sha256(body))>", HMAC-SHA256 base64
//   dengan Secret Key, header "Signature: HMACSHA256=<base64>".
// - Signature (GET): tanpa baris Digest.
// Tanpa kredensial, modul melaporkan configured=false dan checkout API hanya
// mengizinkan simulasi di luar produksi.

export interface DokuConfig {
  clientId: string;
  secretKey: string;
  baseUrl: string; // https://api-sandbox.doku.com | https://api.doku.com
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
  const baseUrl = env === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com";
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

function timestampUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function digestBase64(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("base64");
}

function hmacSignature(config: DokuConfig, stringToSign: string): string {
  return createHmac("sha256", config.secretKey).update(stringToSign).digest("base64");
}

function stringToSign(
  config: DokuConfig,
  requestId: string,
  ts: string,
  requestTarget: string,
  rawBody: string,
  includeDigest: boolean,
): string {
  const lines = [
    `Client-Id:${config.clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${ts}`,
    `Request-Target:${requestTarget}`,
  ];
  if (includeDigest) lines.push(`Digest:${digestBase64(rawBody)}`);
  return lines.join("\n");
}

function buildHeaders(
  config: DokuConfig,
  requestTarget: string,
  rawBody: string,
  isPost: boolean,
): Record<string, string> {
  const requestId = randomUUID();
  const ts = timestampUtc();
  const signature = hmacSignature(config, stringToSign(config, requestId, ts, requestTarget, rawBody, isPost));
  return {
    "Client-Id": config.clientId,
    "Request-Id": requestId,
    "Request-Timestamp": ts,
    Signature: `HMACSHA256=${signature}`,
  };
}

// Verifikasi signature notifikasi masuk dari DOKU. Request-Target = path URL
// notification (domain kita), Digest = base64 sha256 raw body (POST). Kandidat
// toleran: dengan/tanpa Digest, dengan/tanpa target — di luar itu, fallback
// ke Orders Status API sebagai sumber kebenaran.
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
  const ts = headers["request-timestamp"] ?? headers["request-date"] ?? "";
  const clientId = headers["client-id"] ?? "";
  const requestId = headers["request-id"] ?? "";
  if (!given || !clientId || !ts || !requestId) return false;

  const digest = digestBase64(rawBody);
  const candidates = [
    stringToSign(config, requestId, ts, requestTarget, rawBody, true),
    stringToSign(config, requestId, ts, requestTarget, rawBody, false),
    // Tanpa Request-Target (varian lama sebagian integration)
    `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${ts}\nDigest:${digest}`,
  ];
  const givenBuf = Buffer.from(given);
  return candidates.some((c) => {
    const expected = hmacSignature(config, c);
    return (
      expected.length === givenBuf.length &&
      timingSafeEqual(Buffer.from(expected), givenBuf)
    );
  });
}

export interface DokuCheckoutRequest {
  invoiceNumber: string;
  amount: number; // IDR
  customer: { name: string; email: string };
  lineItems: DokuLineItem[];
  callbackUrl?: string;
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
      auto_redirect: true,
      ...(req.callbackUrl ? { callback_url: req.callbackUrl } : {}),
      line_items: req.lineItems,
    },
    payment: { payment_due_date: 1440 },
    customer: {
      // customer.name harus alfabet — email local part sering mengandung
      // angka/titik, jadi dibersihkan.
      name: req.customer.name.replace(/[^a-zA-Z]/g, "").slice(0, 60) || "Customer",
      email: req.customer.email,
    },
  });
  const headers = buildHeaders(config, "/checkout/v1/payment", body, true);
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
    // Respons Checkout v1 menaruh URL pembayaran di payment.url.
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
  } catch (e) {
    console.error("[doku] checkout network error", e instanceof Error ? e.message : e);
    return { ok: false, error: "doku-network" };
  }
}

export type DokuStatus = "PAID" | "PENDING" | "EXPIRED" | "FAILED" | "UNKNOWN";

// Cek status order di DOKU (sumur kebenaran): GET /orders/v1/status/{invoice}
// — tanpa Digest pada signature (aturan GET). Dipakai halaman sukses dan
// sebagai fallback bila signature webhook tidak dapat diverifikasi.
export async function fetchDokuOrderStatus(
  config: DokuConfig,
  invoiceNumber: string,
  _amount: number,
): Promise<{ status: DokuStatus; raw: string }> {
  void _amount;
  const requestTarget = `/orders/v1/status/${encodeURIComponent(invoiceNumber)}`;
  const headers = buildHeaders(config, requestTarget, "", false);
  try {
    const res = await fetch(`${config.baseUrl}${requestTarget}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[doku] status error", res.status, raw.slice(0, 300));
      return { status: "UNKNOWN", raw };
    }
    let status: DokuStatus = "UNKNOWN";
    try {
      const data = JSON.parse(raw) as {
        transaction?: { status?: string };
        transaction_status?: string;
        order?: { status?: string };
      };
      const tx = (data.transaction?.status ?? data.transaction_status ?? "").toUpperCase();
      const orderStatus = (data.order?.status ?? "").toUpperCase();
      if (["SUCCESS", "PAID", "COMPLETED", "FINISH"].includes(tx)) status = "PAID";
      else if (["FAILED", "DENIED", "CANCELED", "CANCELLED"].includes(tx)) status = "FAILED";
      else if (orderStatus === "ORDER_EXPIRED") status = "EXPIRED";
      else if (tx || orderStatus) status = "PENDING";
    } catch {
      // raw diawetkan untuk debug
    }
    return { status, raw };
  } catch (e) {
    console.error("[doku] status network error", e instanceof Error ? e.message : e);
    return { status: "UNKNOWN", raw: "" };
  }
}
