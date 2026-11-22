import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/** El comprador manda la referencia (UTR) de su pago UPI; el club la confirmará en el panel. */
export async function POST(req: Request, { params }: RouteContext<"/api/orders/[id]/upi">) {
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { k?: string; utr?: string };
  const utr = String(b.utr ?? "").replace(/\D/g, "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(String(b.k ?? ""))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (utr.length !== 12) return NextResponse.json({ error: "bad" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: o } = await sb.from("orders").select("id, status, payment_provider, provider_payment_id").eq("id", id).eq("access_key", b.k!).maybeSingle();
  if (!o || o.payment_provider !== "upi") return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (o.status !== "pending" || o.provider_payment_id) return NextResponse.json({ ok: true });

  const { count } = await sb.from("orders").select("id", { count: "exact", head: true })
    .eq("payment_provider", "upi").eq("provider_payment_id", utr).neq("status", "failed");
  if ((count ?? 0) > 0) return NextResponse.json({ error: "used" }, { status: 409 });

  const { error } = await sb.from("orders").update({ provider_payment_id: utr }).eq("id", id).eq("status", "pending").is("provider_payment_id", null);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
