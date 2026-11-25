import "server-only";
import { confirmOrder } from "./confirm";
import type { Lang } from "./i18n";
import { getCheckoutSession, refundPayment, type StripeSession } from "./stripe";
import { supabaseAdmin } from "./supabase/server";

/**
 * Emite las entradas de un pedido de Stripe si la sesión está pagada.
 * Lo llaman la vuelta del comprador y el webhook; da igual cuál llegue primero.
 */
export async function settleStripeOrder(orderId: string, lang: Lang, session?: StripeSession) {
  const sb = supabaseAdmin();
  const { data: o } = await sb.from("orders").select("id, status, payment_provider, provider_order_id").eq("id", orderId).maybeSingle();
  if (!o || o.payment_provider !== "stripe" || !o.provider_order_id) return "not_found" as const;
  if (o.status === "paid") return "paid" as const;
  const s = session ?? (await getCheckoutSession(o.provider_order_id));
  if (s.id !== o.provider_order_id) return "not_found" as const;
  if (s.payment_status !== "paid" || !s.payment_intent) return "pending" as const;

  const conf = await confirmOrder(o.id, s.payment_intent, lang);
  if (conf.ok) return "paid" as const;
  // Se agotaron mientras pagaba: devolvemos el dinero y lo marcamos.
  try { await refundPayment(s.payment_intent); } catch (e) { console.error("[stripe] refund", e); }
  await sb.from("orders").update({ status: "refunded", provider_payment_id: s.payment_intent }).eq("id", o.id);
  return "refunded" as const;
}
