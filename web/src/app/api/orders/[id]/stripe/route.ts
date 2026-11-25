import { NextResponse } from "next/server";
import { getT } from "@/lib/lang";
import { settleStripeOrder } from "@/lib/stripe-confirm";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Vuelta desde Stripe Checkout: confirmamos el pago y llevamos al comprador a sus entradas. */
export async function GET(req: Request, { params }: RouteContext<"/api/orders/[id]/stripe">) {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k") ?? "";
  const { lang } = await getT();
  const home = new URL("/", req.url);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(k)) return NextResponse.redirect(home);
  const { data: o } = await supabaseAdmin().from("orders").select("id, access_key").eq("id", id).maybeSingle();
  if (!o || o.access_key !== k) return NextResponse.redirect(home);
  try {
    await settleStripeOrder(id, lang);
  } catch (e) {
    console.error("[stripe return]", e); // el webhook lo confirmará igualmente
  }
  return NextResponse.redirect(new URL(`/t/${id}?k=${k}&nuevo=1`, req.url));
}
