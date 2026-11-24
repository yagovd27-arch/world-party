import "server-only";
import { supabaseAdmin } from "./supabase/server";

/** Niveles de PR por entradas vendidas (en total, en todos los clubs). */
export const PR_LEVELS = [
  { id: "starter", name: "Starter", at: 0 },
  { id: "rising", name: "Rising", at: 50 },
  { id: "headliner", name: "Headliner", at: 200 },
  { id: "legend", name: "Legend", at: 500 },
] as const;
export type PrLevel = (typeof PR_LEVELS)[number];

export function prLevel(tickets: number) {
  let i = 0;
  PR_LEVELS.forEach((l, j) => { if (tickets >= l.at) i = j; });
  const cur = PR_LEVELS[i], next = PR_LEVELS[i + 1] ?? null;
  const pct = next ? Math.min(100, ((tickets - cur.at) / (next.at - cur.at)) * 100) : 100;
  return { cur, next, pct };
}

export const CODE_RE = /^[A-Z0-9]{3,16}$/;
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

export type Promoter = { id: string; user_id: string; code: string; name: string; email: string; created_at: string };

export async function getPromoterByCode(code: string): Promise<Promoter | null> {
  const c = normalizeCode(code);
  if (!CODE_RE.test(c)) return null;
  const { data } = await supabaseAdmin().from("promoters").select("*").eq("code", c).maybeSingle();
  return (data as Promoter) ?? null;
}

export async function getMyPromoter(userId: string): Promise<Promoter | null> {
  const { data } = await supabaseAdmin().from("promoters").select("*").eq("user_id", userId).maybeSingle();
  return (data as Promoter) ?? null;
}

type SaleRow = {
  promoter_id: string; subtotal: number; currency: string; event_id: string; created_at: string;
  tickets: { id: string }[];
};

const commission = (amount: number, pct: number) => Math.round((amount * pct) / 100);

/** Ranking de PRs de un club: quién ha vendido más (todas las fechas o un evento). */
export async function rankingForClub(clubId: string, eventId?: string) {
  const sb = supabaseAdmin();
  const { data: evs } = await sb.from("events").select("id, title, starts_at").eq("club_id", clubId).order("starts_at", { ascending: false }).limit(200);
  const events = (evs as { id: string; title: string; starts_at: string }[]) ?? [];
  const ids = eventId ? events.filter((e) => e.id === eventId).map((e) => e.id) : events.map((e) => e.id);

  const [{ data: rows }, { data: links }] = await Promise.all([
    ids.length
      ? sb.from("orders").select("promoter_id, subtotal, currency, event_id, created_at, tickets(id)")
          .in("event_id", ids).eq("status", "paid").not("promoter_id", "is", null).limit(5000)
      : Promise.resolve({ data: [] as SaleRow[] }),
    sb.from("club_promoters").select("promoter_id, commission_pct, paid, promoter:promoters(id, code, name, email)").eq("club_id", clubId),
  ]);
  const sales = (rows as unknown as SaleRow[]) ?? [];
  type Link = { promoter_id: string; commission_pct: number; paid: number; promoter: { id: string; code: string; name: string; email: string } };
  const linked = (links as unknown as Link[]) ?? [];

  // PRs que vendieron con su código pero el club aún no ha añadido.
  const known = new Set(linked.map((l) => l.promoter_id));
  const strangers = [...new Set(sales.map((s) => s.promoter_id))].filter((id) => !known.has(id));
  const { data: extra } = strangers.length
    ? await sb.from("promoters").select("id, code, name, email").in("id", strangers)
    : { data: [] };

  // Comisión total (de siempre) para calcular lo pendiente, aunque se filtre por evento.
  const allIds = events.map((e) => e.id);
  const { data: allRows } = eventId && allIds.length
    ? await sb.from("orders").select("promoter_id, subtotal").in("event_id", allIds).eq("status", "paid").not("promoter_id", "is", null).limit(5000)
    : { data: null };
  const lifetime = (allRows as { promoter_id: string; subtotal: number }[] | null) ?? sales;

  const people = [
    ...linked.map((l) => ({ ...l.promoter, pct: Number(l.commission_pct), paid: l.paid, added: true })),
    ...((extra as { id: string; code: string; name: string; email: string }[]) ?? []).map((p) => ({ ...p, pct: 0, paid: 0, added: false })),
  ];

  const list = people.map((p) => {
    const mine = sales.filter((s) => s.promoter_id === p.id);
    const tickets = mine.reduce((n, s) => n + s.tickets.length, 0);
    const revenue = mine.reduce((n, s) => n + s.subtotal, 0);
    const earned = commission(lifetime.filter((s) => s.promoter_id === p.id).reduce((n, s) => n + s.subtotal, 0), p.pct);
    return {
      ...p,
      tickets,
      orders: mine.length,
      revenue,
      commission: commission(revenue, p.pct),
      earned,
      owed: Math.max(0, earned - p.paid),
    };
  }).sort((a, b) => b.tickets - a.tickets || b.revenue - a.revenue || a.code.localeCompare(b.code));

  return { events, list };
}

/** Lo que ve el PR: sus ventas por club, comisión y nivel. */
export async function statsForPromoter(promoterId: string) {
  const sb = supabaseAdmin();
  const [{ data: rows }, { data: links }] = await Promise.all([
    sb.from("orders").select("subtotal, currency, event_id, created_at, tickets(id), event:events(id, title, starts_at, club_id, club:clubs(id, name, city_id))")
      .eq("promoter_id", promoterId).eq("status", "paid").order("created_at", { ascending: false }).limit(5000),
    sb.from("club_promoters").select("club_id, commission_pct, paid, club:clubs(id, name, city_id)").eq("promoter_id", promoterId),
  ]);
  type Row = { subtotal: number; currency: string; tickets: { id: string }[]; event: { id: string; title: string; starts_at: string; club_id: string; club: { id: string; name: string; city_id: string } } };
  type Link = { club_id: string; commission_pct: number; paid: number; club: { id: string; name: string; city_id: string } };
  const sales = (rows as unknown as Row[]) ?? [];
  const linked = (links as unknown as Link[]) ?? [];

  const clubIds = [...new Set([...linked.map((l) => l.club_id), ...sales.map((s) => s.event.club_id)])];
  const clubs = clubIds.map((id) => {
    const l = linked.find((x) => x.club_id === id);
    const mine = sales.filter((s) => s.event.club_id === id);
    const pct = l ? Number(l.commission_pct) : 0;
    const revenue = mine.reduce((n, s) => n + s.subtotal, 0);
    const earned = commission(revenue, pct);
    return {
      id,
      name: l?.club.name ?? mine[0]?.event.club.name ?? "",
      city_id: l?.club.city_id ?? mine[0]?.event.club.city_id ?? "",
      pct,
      added: Boolean(l),
      tickets: mine.reduce((n, s) => n + s.tickets.length, 0),
      revenue,
      earned,
      paid: l?.paid ?? 0,
      owed: Math.max(0, earned - (l?.paid ?? 0)),
    };
  }).sort((a, b) => b.tickets - a.tickets);

  // Por evento, para ver qué noche funcionó mejor.
  const byEvent = new Map<string, { id: string; title: string; starts_at: string; club: string; city_id: string; tickets: number }>();
  for (const s of sales) {
    const cur = byEvent.get(s.event.id) ?? { id: s.event.id, title: s.event.title, starts_at: s.event.starts_at, club: s.event.club.name, city_id: s.event.club.city_id, tickets: 0 };
    cur.tickets += s.tickets.length;
    byEvent.set(s.event.id, cur);
  }

  // Próximos eventos de sus clubs para compartir con su link.
  const linkedIds = linked.map((l) => l.club_id);
  const { data: up } = linkedIds.length
    ? await sb.from("events").select("id, title, starts_at, city_id, club:clubs(name)").in("club_id", linkedIds)
        .eq("status", "published").gte("starts_at", new Date(Date.now() - 6 * 3600e3).toISOString()).order("starts_at").limit(12)
    : { data: [] };

  return {
    tickets: clubs.reduce((n, c) => n + c.tickets, 0),
    clubs,
    events: [...byEvent.values()].sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    upcoming: (up as unknown as { id: string; title: string; starts_at: string; city_id: string; club: { name: string } }[]) ?? [],
  };
}
