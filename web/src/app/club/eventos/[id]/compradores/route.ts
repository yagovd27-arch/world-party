import { NextResponse } from "next/server";
import { requireClub } from "@/lib/auth";
import { parts, tzFor } from "@/lib/format";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

/**
 * Lista de compradores de un evento en CSV (se abre en Excel o Google Sheets).
 * Sirve de respaldo en la puerta si falla el escáner. Las reglas de la base de datos
 * solo dejan ver los pedidos a quien es del club.
 */
export async function GET(_req: Request, { params }: RouteContext<"/club/eventos/[id]/compradores">) {
  const { id } = await params;
  await requireClub();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const sb = await supabaseServer();
  const { data: ev } = await sb.from("events").select("id, title, city_id").eq("id", id).maybeSingle();
  if (!ev) return new NextResponse("Not found", { status: 404 });
  const { data } = await sb.from("orders")
    .select("id, buyer_name, buyer_email, buyer_phone, subtotal, discount, currency, created_at, promoter_id, order_items(qty, ticket_type:ticket_types(name)), tickets(scanned_at)")
    .eq("event_id", id).eq("status", "paid").order("buyer_name").limit(5000);
  type Row = { buyer_name: string; buyer_email: string; buyer_phone: string | null; subtotal: number; discount: number; currency: string; created_at: string; promoter_id: string | null; order_items: { qty: number; ticket_type: { name: string } }[]; tickets: { scanned_at: string | null }[] };
  const rows = (data as unknown as Row[]) ?? [];
  const pids = [...new Set(rows.map((r) => r.promoter_id).filter(Boolean))] as string[];
  const { data: prs } = pids.length ? await supabaseAdmin().from("promoters").select("id, code").in("id", pids) : { data: [] };
  const code = (pid: string | null) => (prs as { id: string; code: string }[] | null)?.find((p) => p.id === pid)?.code ?? "";
  const tz = tzFor(ev.city_id);
  const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Nombre", "Email", "Teléfono", "Entradas", "Nº entradas", "Ya entraron", "Pagado", "Moneda", "Código PR", "Comprado"];
  const lines = rows.map((r) => {
    const p = parts(r.created_at, tz);
    return [
      r.buyer_name, r.buyer_email, r.buyer_phone ?? "",
      r.order_items.map((i) => `${i.qty}x ${i.ticket_type.name}`).join(" + "),
      r.tickets.length, r.tickets.filter((t) => t.scanned_at).length,
      r.subtotal, r.currency, code(r.promoter_id), `${p.ymd} ${p.time}`,
    ].map(esc).join(",");
  });
  const csv = "﻿" + [head.join(","), ...lines].join("\n");
  const name = `${ev.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "evento"}-compradores.csv`;
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
