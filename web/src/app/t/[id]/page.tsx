import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import BottomNav from "@/components/BottomNav";
import { parts, shortDate, tzFor } from "@/lib/format";
import { isSupabaseOn, supabaseAdmin } from "@/lib/supabase/server";
import { getT } from "@/lib/lang";

type Row = {
  id: string; status: string; buyer_name: string;
  event: { title: string; starts_at: string; city_id: string; club: { name: string; area: string | null } };
  tickets: { code: string; scanned_at: string | null; ticket_type: { name: string } }[];
};

export default async function TicketPage({ params, searchParams }: PageProps<"/t/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const key = typeof sp.k === "string" ? sp.k : "";
  if (!isSupabaseOn || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(key)) notFound();

  const { data } = await supabaseAdmin()
    .from("orders")
    .select("id, status, buyer_name, event:events(title, starts_at, city_id, club:clubs(name, area)), tickets(code, scanned_at, ticket_type:ticket_types(name))")
    .eq("id", id)
    .eq("access_key", key)
    .maybeSingle();
  if (!data) notFound();
  const o = data as unknown as Row;
  const tz = tzFor(o.event.city_id);
  const { lang, t } = await getT();
  const qrs = await Promise.all(o.tickets.map((t) => QRCode.toDataURL(t.code, { margin: 1, width: 400, color: { dark: "#19050b", light: "#f5ebda" } })));

  return (
    <main className="shell">
      {sp.nuevo ? (
        <div className="section" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t.youreIn}</h1>
          <p className="muted" style={{ marginTop: 6 }}>{t.showQr}</p>
        </div>
      ) : (
        <header className="top"><Link href="/entradas" className="pill">{t.myTicketsBack}</Link></header>
      )}
      {o.status !== "paid" && <p className="section error">{t.notPaid(o.status)}</p>}
      {o.tickets.map((tk, i) => (
        <div className="ticket" key={tk.code}>
          <div className="tb">
            <h2>{o.event.title}</h2>
            <div className="tgrid">
              <div><span>{t.date}</span><b>{shortDate(o.event.starts_at, tz, lang)}</b></div>
              <div><span>{t.time}</span><b>{t.hour(parts(o.event.starts_at, tz).time)}</b></div>
              <div><span>{t.venue}</span><b>{o.event.club.name}</b></div>
              <div><span>{t.ticket}</span><b>{tk.ticket_type.name} · {i + 1}/{o.tickets.length}</b></div>
            </div>
          </div>
          <div className="perf" />
          <div className="qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrs[i]} alt={t.qrAlt(tk.code)} />
            <code>{tk.code}</code>
            {tk.scanned_at && <span className="used">{t.used}</span>}
          </div>
        </div>
      ))}
      <p className="fine section" style={{ textAlign: "center" }}>{t.inNameOf(o.buyer_name)}</p>
      <BottomNav />
    </main>
  );
}
