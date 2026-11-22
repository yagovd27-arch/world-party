import { NextResponse } from "next/server";
import { DEMO_CITIES, DEMO_EVENTS } from "@/lib/demo";
import { parts, serviceFee, shortDate, tzFor } from "@/lib/format";
import { createRazorpayOrder, demoPayments, razorpayKeyId, razorpayOn } from "@/lib/payments";
import { isSupabaseOn, supabaseAdmin } from "@/lib/supabase/server";
import { SERVICE_FEE_RATE, type EventItem } from "@/lib/types";

type Body = {
  eventId?: string;
  items?: { id: string; qty: number }[];
  buyer?: { name?: string; email?: string; phone?: string };
};

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const code = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return bad("Pedido no válido."); }
  const { eventId, items, buyer } = body;
  if (!eventId || !Array.isArray(items) || !items.length) return bad("Faltan las entradas.");
  if (!buyer?.name || !buyer.email || !/^\S+@\S+\.\S+$/.test(buyer.email)) return bad("Faltan tus datos.");
  if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 10)) return bad("Cantidad no válida.");

  // Sin base de datos: compra simulada que se guarda en el móvil.
  if (!isSupabaseOn) {
    const e = DEMO_EVENTS.find((x) => x.id === eventId);
    if (!e) return bad("Evento no encontrado.", 404);
    const city = DEMO_CITIES.find((c) => c.id === e.city_id)!;
    const tz = tzFor(e.city_id);
    const lines = items.map((i) => ({ t: e.ticket_types.find((t) => t.id === i.id), qty: i.qty }));
    if (lines.some((l) => !l.t)) return bad("Tipo de entrada no válido.");
    return NextResponse.json({
      mode: "local",
      order: {
        id: crypto.randomUUID(),
        event: { id: e.id, title: e.title, starts: `${shortDate(e.starts_at, tz)} · ${parts(e.starts_at, tz).time} h`, venue: e.club.name, city: city.name },
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
  if (evErr || !ev || ev.status !== "published") return bad("Este evento no está a la venta.", 404);
  const event = ev as unknown as EventItem & { city: { currency: string } };
  if (new Date(event.starts_at).getTime() < Date.now() - 4 * 3600e3) return bad("Este evento ya pasó.");

  const lines = [];
  for (const i of items) {
    const t = event.ticket_types.find((x) => x.id === i.id);
    if (!t) return bad("Tipo de entrada no válido.");
    if (t.sales_end && new Date(t.sales_end).getTime() < Date.now()) return bad(`${t.name}: la venta ya terminó.`);
    if (t.sold + i.qty > t.capacity) return bad(`${t.name}: no quedan suficientes entradas.`);
    lines.push({ t, qty: i.qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.qty * l.t.price, 0);
  const fee = serviceFee(subtotal, SERVICE_FEE_RATE);
  const total = subtotal + fee;
  const currency = event.city.currency;

  if (!razorpayOn && !demoPayments) return bad("Los pagos todavía no están activados.", 503);

  const { data: order, error: oErr } = await sb
    .from("orders")
    .insert({
      event_id: event.id, buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone ?? null,
      subtotal, service_fee: fee, total, currency, payment_provider: razorpayOn ? "razorpay" : "demo",
    })
    .select("id, access_key")
    .single();
  if (oErr || !order) return bad("No se pudo crear el pedido.", 500);
  await sb.from("order_items").insert(lines.map((l) => ({ order_id: order.id, ticket_type_id: l.t.id, qty: l.qty, unit_price: l.t.price })));

  if (razorpayOn) {
    try {
      const rp = await createRazorpayOrder(total, currency, order.id.slice(0, 40));
      await sb.from("orders").update({ provider_order_id: rp.id }).eq("id", order.id);
      return NextResponse.json({
        mode: "razorpay", orderId: order.id, accessKey: order.access_key, keyId: razorpayKeyId(),
        providerOrderId: rp.id, amount: rp.amount, currency: rp.currency, description: event.title,
      });
    } catch {
      await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
      return bad("La pasarela de pago no respondió. Inténtalo de nuevo.", 502);
    }
  }

  const { error: cErr } = await sb.rpc("confirm_order", { oid: order.id, provider_payment: "demo" });
  if (cErr) {
    await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
    return bad(cErr.message.includes("sold_out") ? "Se agotaron mientras comprabas." : "No se pudo confirmar.", 409);
  }
  return NextResponse.json({ mode: "paid", orderId: order.id, accessKey: order.access_key });
}
