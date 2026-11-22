import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Respaldo: si el comprador cierra el navegador justo después de pagar,
 * Razorpay nos avisa igualmente y emitimos las entradas.
 * Configurar en Razorpay → Webhooks → evento "payment.captured".
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "firma no válida" }, { status: 400 });
  }
  const payload = JSON.parse(raw);
  if (payload.event !== "payment.captured") return NextResponse.json({ ok: true });
  const p = payload.payload?.payment?.entity;
  const sb = supabaseAdmin();
  const { data: order } = await sb.from("orders").select("id, status").eq("provider_order_id", p?.order_id).maybeSingle();
  if (order && order.status === "pending") {
    const { error } = await sb.rpc("confirm_order", { oid: order.id, provider_payment: p.id });
    if (error) await sb.from("orders").update({ status: "failed", provider_payment_id: p.id }).eq("id", order.id);
  }
  return NextResponse.json({ ok: true });
}
