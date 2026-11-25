import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout (cuenta de Stripe en España): tarjetas de cualquier país, Google Pay y Apple Pay.
 * Se activa poniendo STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET en Vercel.
 */
const SECRET = process.env.STRIPE_SECRET_KEY?.trim() || "";
export const stripeOn = Boolean(SECRET);

async function api<T>(method: "GET" | "POST", path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const body = params
    ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
    : undefined;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${SECRET}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? "error"}`);
  return data as T;
}

export type StripeSession = { id: string; url: string; payment_status: "paid" | "unpaid" | "no_payment_required"; status: string; payment_intent: string | null; metadata: Record<string, string> };

export async function createCheckoutSession(o: {
  orderId: string; currency: string; email: string; lang: string;
  lines: { name: string; qty: number; unit: number }[];
  successUrl: string; cancelUrl: string;
}) {
  const p: Record<string, string | number | undefined> = {
    mode: "payment",
    customer_email: o.email,
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    locale: o.lang === "es" ? "es" : "en",
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    client_reference_id: o.orderId,
    "metadata[order_id]": o.orderId,
    "metadata[lang]": o.lang,
    "payment_intent_data[metadata][order_id]": o.orderId,
  };
  o.lines.forEach((l, i) => {
    p[`line_items[${i}][quantity]`] = l.qty;
    p[`line_items[${i}][price_data][currency]`] = o.currency.toLowerCase();
    p[`line_items[${i}][price_data][unit_amount]`] = Math.round(l.unit * 100);
    p[`line_items[${i}][price_data][product_data][name]`] = l.name;
  });
  return api<StripeSession>("POST", "/checkout/sessions", p);
}

export const getCheckoutSession = (id: string) => api<StripeSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);

/** Devolución completa (p. ej. si se agotaron mientras pagaba). */
export const refundPayment = (paymentIntent: string) =>
  api<{ id: string }>("POST", "/refunds", { payment_intent: paymentIntent, reason: "requested_by_customer" });

/** Comprueba la firma del webhook (cabecera Stripe-Signature: t=…,v1=…). */
export function verifyStripeWebhook(raw: string, header: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return header.split(",").filter((kv) => kv.startsWith("v1=")).some((kv) => {
    const a = Buffer.from(expected), b = Buffer.from(kv.slice(3));
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
