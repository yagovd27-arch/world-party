import { NextResponse } from "next/server";
import { DEMO_CITIES, DEMO_EVENTS } from "@/lib/demo";
import { parts, serviceFee, shortDate, tzFor } from "@/lib/format";
import { createRazorpayOrder, demoPayments, payMethods, razorpayKeyId, type PayMethod } from "@/lib/payments";
import { createCheckoutSession } from "@/lib/stripe";
import { isSupabaseOn, supabaseAdmin } from "@/lib/supabase/server";
import { SERVICE_FEE_RATE, type EventItem } from "@/lib/types";
import { getT } from "@/lib/lang";
import { confirmOrder } from "@/lib/confirm";
import { isAdmin } from "@/lib/auth";
import { getPromoterByCode, normalizeCode } from "@/lib/promoters";

type Body = {
  eventId?: string;
  items?: { id: string; qty: number }[];
  buyer?: { name?: string; email?: string; phone?: string };
  promoCode?: string;
  method?: PayMethod;
};

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const code = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

export async function POST(req: Request) {
  const { lang, t } = await getT();
  const m = t.api;
  let body: Body;
  try { body = await req.json(); } catch { return bad(m.badOrder); }
  const { eventId, items, buyer } = body;
  if (!eventId || !Array.isArray(items) || !items.length) return bad(m.noItems);
  if (!buyer?.name || !buyer.email || !/^\S+@\S+\.\S+$/.test(buyer.email)) return bad(m.noBuyer);
  if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) return bad(m.badQty);

  // Sin base de datos: compra simulada que se guarda en el móvil.
  if (!isSupabaseOn) {
    const e = DEMO_EVENTS.find((x) => x.id === eventId);
    if (!e) return bad(m.noEvent, 404);
    const city = DEMO_CITIES.find((c) => c.id === e.city_id)!;
    const tz = tzFor(e.city_id);
    const lines = items.map((i) => ({ t: e.ticket_types.find((t) => t.id === i.id), qty: i.qty }));
    if (lines.some((l) => !l.t)) return bad(m.badTier);
    return NextResponse.json({
      mode: "local",
      order: {
        id: crypto.randomUUID(),
        event: { id: e.id, title: e.title, starts: `${shortDate(e.starts_at, tz, lang)} · ${t.hour(parts(e.starts_at, tz).time)}`, venue: e.club.name, city: city.name },
        lines: lines.map((l) => ({ name: l.t!.name, qty: l.qty })),
        codes: lines.flatMap((l) => Array.from({ length: l.qty }, code)),
      },
    });
  }

  const sb = supabaseAdmin();
  const { data: ev, error: evErr } = await sb
    .from("events")
    .select("id, title, status, starts_at, city_id, ticket_types(*), city:cities(currency)")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr || !ev || ev.status !== "published") return bad(m.notOnSale, 404);
  const event = ev as unknown as EventItem & { city: { currency: string } };
  if (new Date(event.starts_at).getTime() < Date.now() - 4 * 3600e3) return bad(m.past);

  const lines = [];
  for (const i of items) {
    const t = event.ticket_types.find((x) => x.id === i.id);
    if (!t) return bad(m.badTier);
    if (t.sales_end && new Date(t.sales_end).getTime() < Date.now()) return bad(m.salesEnded(t.name));
    if (t.sold + i.qty > t.capacity) return bad(m.notEnough(t.name));
    lines.push({ t, qty: i.qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.qty * l.t.price, 0);
  const fee = serviceFee(subtotal, SERVICE_FEE_RATE);
  const total = subtotal + fee;
  const currency = event.city.currency;

  // Código de PR: si lo escribió y no existe, se avisa; comprarse a uno mismo no cuenta.
  let promoter_id: string | null = null;
  const promo = normalizeCode(String(body.promoCode ?? ""));
  if (promo) {
    const p = await getPromoterByCode(promo);
    if (!p) return bad(t.pr.eCheckout);
    if (p.email.toLowerCase() !== buyer.email.trim().toLowerCase()) promoter_id = p.id;
  }

  const methods = payMethods(currency, await isAdmin());
  const method: PayMethod | null = body.method && methods.includes(body.method) ? body.method : methods[0] ?? null;
  if (!method && !demoPayments) return bad(m.paymentsOff, 503);
  const provider = method === "razorpay" ? "razorpay" : method === "card" ? "stripe" : method === "upi" ? "upi" : "demo";

  const { data: order, error: oErr } = await sb
    .from("orders")
    .insert({
      event_id: event.id, buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone ?? null,
      subtotal, service_fee: fee, total, currency, payment_provider: provider,
      ...(promoter_id ? { promoter_id } : {}),
    })
    .select("id, access_key")
    .single();
  if (oErr || !order) return bad(m.createFailed, 500);
  await sb.from("order_items").insert(lines.map((l) => ({ order_id: order.id, ticket_type_id: l.t.id, qty: l.qty, unit_price: l.t.price })));

  if (method === "card") {
    try {
      const origin = new URL(req.url).origin;
      const s = await createCheckoutSession({
        orderId: order.id, currency, email: buyer.email.trim(), lang,
        lines: [
          ...lines.map((l) => ({ name: `${event.title} · ${l.t.name}`, qty: l.qty, unit: l.t.price })),
          ...(fee > 0 ? [{ name: t.serviceFee, qty: 1, unit: fee }] : []),
        ],
        successUrl: `${origin}/api/orders/${order.id}/stripe?k=${order.access_key}`,
        cancelUrl: `${origin}/checkout?e=${event.id}&q=${encodeURIComponent(items.map((i) => `${i.id}:${i.qty}`).join(","))}`,
      });
      await sb.from("orders").update({ provider_order_id: s.id }).eq("id", order.id);
      return NextResponse.json({ mode: "redirect", url: s.url, orderId: order.id, accessKey: order.access_key });
    } catch (e) {
      console.error("[orders] stripe", e);
      await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
      return bad(m.gatewayDown, 502);
    }
  }

  if (method === "razorpay") {
    try {
      const rp = await createRazorpayOrder(total, currency, order.id.slice(0, 40));
      await sb.from("orders").update({ provider_order_id: rp.id }).eq("id", order.id);
      return NextResponse.json({
        mode: "razorpay", orderId: order.id, accessKey: order.access_key, keyId: razorpayKeyId(),
        providerOrderId: rp.id, amount: rp.amount, currency: rp.currency, description: event.title,
      });
    } catch {
      await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
      return bad(m.gatewayDown, 502);
    }
  }

  if (method === "upi") return NextResponse.json({ mode: "upi", orderId: order.id, accessKey: order.access_key });

  const conf = await confirmOrder(order.id, "demo", lang);
  if (!conf.ok) {
    await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
    return bad(conf.error === "sold_out" ? m.soldOutWhile : m.confirmFailed, 409);
  }
  return NextResponse.json({ mode: "paid", orderId: order.id, accessKey: order.access_key });
}
