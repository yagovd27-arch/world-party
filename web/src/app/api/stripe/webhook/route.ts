import { NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { verifyStripeWebhook, type StripeSession } from "@/lib/stripe";
import { settleStripeOrder } from "@/lib/stripe-confirm";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Respaldo de Stripe: emite las entradas aunque el comprador cierre el navegador.
 * En Stripe → Developers → Webhooks: https://www.lanit.club/api/stripe/webhook (con www: lanit.club redirige y Stripe no sigue redirecciones) con los eventos
 * checkout.session.completed, checkout.session.async_payment_succeeded y checkout.session.expired.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeWebhook(raw, req.headers.get("stripe-signature") ?? "")) {
    return NextResponse.json({ error: "firma no válida" }, { status: 400 });
  }
  const ev = JSON.parse(raw) as { type: string; data: { object: StripeSession } };
  const s = ev.data.object;
  const orderId = s.metadata?.order_id;
  if (!orderId) return NextResponse.json({ ok: true });
  const lang: Lang = s.metadata?.lang === "es" ? "es" : "en";

  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    await settleStripeOrder(orderId, lang, s);
  } else if (ev.type === "checkout.session.expired") {
    await supabaseAdmin().from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
  }
  return NextResponse.json({ ok: true });
}
