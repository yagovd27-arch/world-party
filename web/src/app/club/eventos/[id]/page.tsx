import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth";
import { getCity } from "@/lib/data";
import { dayLabel, money, parts, tzFor } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import { confirmUpi, rejectUpi, setEventStatus } from "../../actions";
import { orderRef } from "@/lib/payments";
import ClubTop from "../../_ui/ClubTop";
import { getT } from "@/lib/lang";
import { rankingForClub } from "@/lib/promoters";

export const metadata = { title: "la nit for clubs" };

type Ev = {
  id: string; title: string; starts_at: string; status: string; city_id: string; image_url: string | null;
  ticket_types: { id: string; name: string; price: number; sold: number; capacity: number; sort: number }[];
};
type Order = {
  id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null; subtotal: number; created_at: string;
  order_items: { qty: number; ticket_type: { name: string } }[];
  tickets: { scanned_at: string | null }[];
};


export default async function ClubEvent({ params, searchParams }: PageProps<"/club/eventos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { admin, club } = await requireClub();
  const { lang, t } = await getT();
  const c = t.club;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const sb = await supabaseServer();
  const [{ data: ev }, { data: ord }, { data: pend }] = await Promise.all([
    sb.from("events").select("id, title, starts_at, status, city_id, image_url, ticket_types(id, name, price, sold, capacity, sort)").eq("id", id).maybeSingle(),
    sb.from("orders")
      .select("id, buyer_name, buyer_email, buyer_phone, subtotal, created_at, order_items(qty, ticket_type:ticket_types(name)), tickets(scanned_at)")
      .eq("event_id", id).eq("status", "paid").order("created_at", { ascending: false }).limit(500),
    sb.from("orders")
      .select("id, buyer_name, buyer_email, buyer_phone, total, created_at, provider_payment_id, order_items(qty, ticket_type:ticket_types(name))")
      .eq("event_id", id).eq("status", "pending").eq("payment_provider", "upi").not("provider_payment_id", "is", null)
      .order("created_at", { ascending: true }).limit(200),
  ]);
  type Pending = { id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null; total: number; created_at: string; provider_payment_id: string; order_items: { qty: number; ticket_type: { name: string } }[] };
  const pending = (pend as unknown as Pending[]) ?? [];
  if (!ev) notFound();
  const e = ev as Ev;
  const orders = (ord as unknown as Order[]) ?? [];
  const city = await getCity(e.city_id);
  const sym = city?.currency_symbol ?? "";
  const tz = tzFor(e.city_id);
  const tiers = [...e.ticket_types].sort((a, b) => a.sort - b.sort);
  const sold = tiers.reduce((s, t) => s + t.sold, 0);
  const cap = tiers.reduce((s, t) => s + t.capacity, 0);
  const revenue = tiers.reduce((s, t) => s + t.sold * t.price, 0);
  const tickets = orders.flatMap((o) => o.tickets);
  const inside = tickets.filter((t) => t.scanned_at).length;
  const prs = (await rankingForClub(club.id, e.id)).list.filter((r) => r.tickets > 0);
  const note = typeof sp.n === "string" ? sp.n : "";
  const err = typeof sp.e === "string" ? sp.e : "";

  const statusBtn = (status: string, label: string, ghost = true) => (
    <form action={setEventStatus}>
      <input type="hidden" name="id" value={e.id} />
      <input type="hidden" name="status" value={status} />
      <button className={`cta${ghost ? " ghost" : ""} block`}>{label}</button>
    </form>
  );

  return (
    <>
      <ClubTop active="panel" admin={admin} />
      <section className="section">
        <Link href="/club" className="fine">{c.eventsBack}</Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10 }}>
          <div className="ph" style={{ width: 84, height: 104, borderRadius: 10, flexShrink: 0, backgroundImage: e.image_url ? `url(${e.image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div style={{ minWidth: 0 }}>
            <span className={`st st-${e.status}`}>{c.status[e.status]}</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, marginTop: 6 }}>{e.title}</h1>
            <span className="fine">{dayLabel(e.starts_at, tz, lang)}, {t.hour(parts(e.starts_at, tz).time)}</span>
          </div>
        </div>
        {note && <p className="notice">{note}</p>}
        {err && <p className="error">{err}</p>}

        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><b>{sold}<small className="fine">/{cap}</small></b><span>{c.soldCap}</span></div>
          <div className="stat"><b>{money(revenue, sym)}</b><span>{c.forClub}</span></div>
          <div className="stat"><b>{inside}</b><span>{c.inside}</span></div>
        </div>

        <div className="actions">
          <Link href={`/club/eventos/${e.id}/editar`} className="cta">{c.edit}</Link>
          {e.status === "published" && <Link href={`/e/${e.id}`} className="cta ghost" target="_blank">{c.publicPage}</Link>}
          <Link href="/club/scan" className="cta ghost">{c.tabScan}</Link>
        </div>
      </section>

      {pending.length > 0 && (
        <>
          <h2 className="ghead">{t.upi.pendingTitle(pending.length)}</h2>
          <div className="section pending-upi" style={{ paddingTop: 10 }}>
            <p className="fine">{t.upi.pendingHelp}</p>
            {pending.map((o) => (
              <div className="card" key={o.id}>
                <div className="row">
                  <span><b>{o.buyer_name}</b><span className="fine" style={{ display: "block" }}>{o.buyer_email}{o.buyer_phone ? `, ${o.buyer_phone}` : ""}</span></span>
                  <span style={{ textAlign: "right" }}><b>{money(o.total, sym)}</b><span className="fine" style={{ display: "block" }}>{orderRef(o.id)}</span></span>
                </div>
                <div className="row">
                  <span className="utr">UTR {o.provider_payment_id}</span>
                  <span className="fine">{o.order_items.map((i) => `${i.qty}× ${i.ticket_type.name}`).join(", ")}</span>
                </div>
                <div className="actions" style={{ marginTop: 0 }}>
                  <form action={confirmUpi}><input type="hidden" name="id" value={o.id} /><button className="cta gold block">{t.upi.confirm}</button></form>
                  <form action={rejectUpi}><input type="hidden" name="id" value={o.id} /><button className="cta ghost block">{t.upi.reject}</button></form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="ghead">{t.tickets}</h2>
      <div className="section" style={{ paddingTop: 10 }}>
        <table className="t">
          <thead><tr><th>{c.tType}</th><th>{c.tPrice}</th><th>{c.tSold}</th><th>{c.tRevenue}</th></tr></thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}><td>{t.name}</td><td>{money(t.price, sym)}</td><td>{t.sold}/{t.capacity}</td><td>{money(t.sold * t.price, sym)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {prs.length > 0 && (
        <>
          <h2 className="ghead">{t.pr.club.eventPrs}</h2>
          <div className="section" style={{ paddingTop: 10 }}>
            <table className="t">
              <thead><tr><th>#</th><th>{t.pr.club.cPr}</th><th>{t.pr.club.cTickets}</th><th>{t.pr.club.cRevenue}</th><th>{t.pr.club.cPct}</th></tr></thead>
              <tbody>
                {prs.slice(0, 5).map((r, i) => (
                  <tr key={r.id}><td>{i + 1}</td><td><b>{r.code}</b><span className="fine" style={{ display: "block" }}>{r.name}</span></td><td>{r.tickets}</td><td>{money(r.revenue, sym)}</td><td>{r.added ? money(r.commission, sym) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
            <Link href={`/club/prs?ev=${e.id}`} className="fine" style={{ display: "inline-block", marginTop: 10, textDecoration: "underline" }}>{t.pr.club.seeRanking}</Link>
          </div>
        </>
      )}

      <h2 className="ghead">{c.buyers(orders.length)}</h2>
      <div className="section" style={{ paddingTop: 10, overflowX: "auto" }}>
        {orders.length ? (
          <table className="t">
            <thead><tr><th>{c.bName}</th><th>{c.bTickets}</th><th>{c.bContact}</th><th>{c.bInside}</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.buyer_name}</td>
                  <td>{o.order_items.map((i) => `${i.qty}× ${i.ticket_type.name}`).join(", ")}</td>
                  <td className="fine">{o.buyer_email}{o.buyer_phone ? <><br />{o.buyer_phone}</> : null}</td>
                  <td>{o.tickets.filter((t) => t.scanned_at).length}/{o.tickets.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{c.noSales}</b>{c.noSalesSub}</div>}
      </div>

      <div className="section actions" style={{ paddingBottom: 30 }}>
        {e.status === "draft" && statusBtn("published", c.publish, false)}
        {e.status === "published" && statusBtn("draft", c.unpublish)}
        {e.status === "cancelled" && statusBtn("draft", c.restore)}
        {e.status !== "cancelled" && sold === 0 && statusBtn("cancelled", c.cancelEvent)}
      </div>
    </>
  );
}
