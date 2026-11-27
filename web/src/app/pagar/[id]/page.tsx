import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { dayLabel, money, parts, tzFor } from "@/lib/format";
import { getT } from "@/lib/lang";
import { orderRef, UPI_NAME, UPI_VPA, upiUri } from "@/lib/payments";
import { isSupabaseOn, supabaseAdmin } from "@/lib/supabase/server";
import UpiForm, { Vpa } from "./UpiForm";

export const metadata = { title: "UPI | la nit", robots: { index: false } };

type Row = {
  id: string; status: string; total: number; currency: string; payment_provider: string | null; provider_payment_id: string | null;
  event: { title: string; starts_at: string; city_id: string; club: { name: string } };
};

/** Pago manual por UPI: QR con el importe exacto y formulario para la referencia (UTR). */
export default async function PayUpi({ params, searchParams }: PageProps<"/pagar/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const key = typeof sp.k === "string" ? sp.k : "";
  if (!isSupabaseOn || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(key)) notFound();
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("id, status, total, currency, payment_provider, provider_payment_id, event:events(title, starts_at, city_id, club:clubs(name))")
    .eq("id", id).eq("access_key", key).maybeSingle();
  if (!data) notFound();
  const o = data as unknown as Row;
  if (o.status === "paid") redirect(`/t/${o.id}?k=${key}&nuevo=1`);

  const { lang, t } = await getT();
  const u = t.upi;
  const ref = orderRef(o.id);
  const tz = tzFor(o.event.city_id);
  const amount = money(o.total, "₹");
  const head = (
    <div className="card">
      <span className="fine">{dayLabel(o.event.starts_at, tz, lang)}, {t.hour(parts(o.event.starts_at, tz).time)}, {o.event.club.name}</span>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px" }}>{o.event.title}</h2>
      <span className="fine">{u.order(ref)}</span>
    </div>
  );

  if (o.status === "failed") {
    return <main className="shell"><section className="section">{head}<p className="notice">{u.rejected}</p>{o.provider_payment_id && <p className="fine" style={{ marginTop: 10 }}>{u.yourRef(o.provider_payment_id)}</p>}</section></main>;
  }

  if (o.provider_payment_id) {
    return (
      <main className="shell">
        <section className="section">
          {head}
          <h1 className="ptitle" style={{ marginTop: 24 }}>{u.waitingTitle}</h1>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{u.waiting}</p>
          <p className="fine" style={{ marginTop: 12 }}>{u.yourRef(o.provider_payment_id)}</p>
        </section>
      </main>
    );
  }

  if (!UPI_VPA || o.payment_provider !== "upi") notFound();
  const uri = upiUri(o.total, ref);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 440, color: { dark: "#19050b", light: "#ffffff" } });

  return (
    <main className="shell">
      <header className="top">
        <Link className="icon-btn homebtn" href="/" aria-label="la nit">la nit<b>.</b></Link>
        <span className="logo" style={{ fontSize: 20 }}>{u.title}</span>
        <span style={{ width: 42 }} />
      </header>
      <section className="section">
        {head}
        <div className="upi">
          <span className="fine">{u.amount}</span>
          <b className="upi-amount">{amount}</b>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="UPI QR" width={220} height={220} />
          <p className="fine" style={{ textAlign: "center" }}>{u.scan}</p>
          <a className="cta block" href={uri}>{u.openApp}</a>
          <span className="fine">{u.or}</span>
          <Vpa vpa={UPI_VPA} name={UPI_NAME} />
          <p className="fine">{u.note(ref)}</p>
        </div>
        <h2 className="psub" style={{ marginTop: 26 }}>{u.step2}</h2>
        <UpiForm orderId={o.id} accessKey={key} />
      </section>
    </main>
  );
}
