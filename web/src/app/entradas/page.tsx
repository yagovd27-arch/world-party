import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getUser } from "@/lib/auth";
import { dayLabel, parts, tzFor } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";
import MyTickets from "./MyTickets";

export const metadata = { title: "Mis entradas · la nit" };

type Row = {
  id: string; access_key: string; created_at: string;
  event: { title: string; starts_at: string; city_id: string; club: { name: string } };
  tickets: { id: string }[];
};

/** Pedidos pagados con el email de la cuenta (si ha iniciado sesión). */
async function accountOrders(email: string): Promise<Row[]> {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("id, access_key, created_at, event:events(title, starts_at, city_id, club:clubs(name)), tickets(id)")
    .ilike("buyer_email", email)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as Row[]) ?? [];
}

export default async function Entradas() {
  const user = await getUser();
  const orders = user?.email ? await accountOrders(user.email) : [];
  const now = Date.now() - 12 * 3600e3;
  const upcoming = orders.filter((o) => Date.parse(o.event.starts_at) >= now);
  const past = orders.filter((o) => Date.parse(o.event.starts_at) < now);

  const card = (o: Row) => {
    const tz = tzFor(o.event.city_id);
    return (
      <Link key={o.id} href={`/t/${o.id}?k=${o.access_key}`} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 0 }}>
          <span className="fine">{dayLabel(o.event.starts_at, tz)} · {parts(o.event.starts_at, tz).time} h</span>
          <b style={{ display: "block", fontSize: 16 }}>{o.event.title}</b>
          <span className="fine">{o.event.club.name} · {o.tickets.length} {o.tickets.length === 1 ? "entrada" : "entradas"}</span>
        </span>
        <span className="scarce">QR →</span>
      </Link>
    );
  };

  return (
    <main className="shell">
      <header className="top"><span className="logo">Mis entradas</span></header>
      {user ? (
        <>
          {upcoming.length > 0 && <div className="list">{upcoming.map(card)}</div>}
          <MyTickets hideIds={orders.map((o) => o.id)} hasAccountOrders={orders.length > 0} />
          {past.length > 0 && (
            <>
              <h2 className="ghead">Pasadas</h2>
              <div className="list" style={{ opacity: 0.6 }}>{past.map(card)}</div>
            </>
          )}
        </>
      ) : (
        <>
          <MyTickets hideIds={[]} hasAccountOrders={false} />
          <p className="fine section" style={{ textAlign: "center" }}>
            <Link href="/perfil" style={{ textDecoration: "underline" }}>Entra con tu email</Link> para ver tus entradas en cualquier móvil.
          </p>
        </>
      )}
      <BottomNav />
    </main>
  );
}
