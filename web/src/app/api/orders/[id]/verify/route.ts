import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getT } from "@/lib/lang";

/** El navegador avisa de que Razorpay cobró; comprobamos la firma y emitimos las entradas. */
export async function POST(req: Request, { params }: RouteContext<"/api/orders/[id]/verify">) {
  const { id } = await params;
  const m = (await getT()).t.api;
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const sb = supabaseAdmin();
  const { data: order } = await sb.from("orders").select("id, status, provider_order_id, access_key").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: m.orderNotFound }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true, accessKey: order.access_key });
  if (b.razorpay_order_id !== order.provider_order_id ||
      !verifyRazorpaySignature(b.razorpay_order_id, b.razorpay_payment_id ?? "", b.razorpay_signature ?? "")) {
    return NextResponse.json({ error: m.verifyFailed }, { status: 400 });
  }
  const { error } = await sb.rpc("confirm_order", { oid: id, provider_payment: b.razorpay_payment_id });
  if (error) {
    await sb.from("orders").update({ status: "failed", provider_payment_id: b.razorpay_payment_id }).eq("id", id);
    return NextResponse.json({ error: m.soldOutRefund }, { status: 409 });
  }
  return NextResponse.json({ ok: true, accessKey: order.access_key });
}
