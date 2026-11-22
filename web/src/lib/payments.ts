import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const razorpayOn = Boolean(KEY_ID && KEY_SECRET);
/** Solo para pruebas: confirma pedidos sin cobrar. Nunca activarlo en producción con clubs reales. */
export const demoPayments = process.env.PAYMENTS_DEMO === "true";

/** Monedas en las que Razorpay cobra en la unidad mínima (paise = ₹/100). */
export async function createRazorpayOrder(amount: number, currency: string, receipt: string) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt }),
  });
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${await res.text()}`);
  return (await res.json()) as { id: string; amount: number; currency: string };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  if (!KEY_SECRET) return false;
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const razorpayKeyId = () => KEY_ID!;
