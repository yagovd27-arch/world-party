import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutForm from "./CheckoutForm";
import { getUser } from "@/lib/auth";
import { getCity, getEvent } from "@/lib/data";
import { dayLabel, money, parts, serviceFee, tzFor } from "@/lib/format";
import { SERVICE_FEE_RATE } from "@/lib/types";
import { getT } from "@/lib/lang";

export default async function Checkout({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const eventId = typeof sp.e === "string" ? sp.e : "";
  const raw = typeof sp.q === "string" ? sp.q : "";
  const e = await getEvent(eventId);
  if (!e) notFound();
  const city = await getCity(e.city_id);
  if (!city) notFound();

  const lines = raw.split(",").map((p) => p.split(":")).flatMap(([id, n]) => {
    const t = e.ticket_types.find((x) => x.id === id);
    const qty = Number(n);
    return t && qty > 0 ? [{ t, qty }] : [];
  });
  if (!lines.length) notFound();
  const subtotal = lines.reduce((s, l) => s + l.qty * l.t.price, 0);
  const fee = serviceFee(subtotal, SERVICE_FEE_RATE);
  const tz = tzFor(e.city_id);
  const user = await getUser();
  const { lang, t } = await getT();

  return (
    <main className="shell">
      <header className="top">
        <Link className="icon-btn" href={`/e/${e.id}`} aria-label={t.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="logo" style={{ fontSize: 20 }}>{t.pay}</span>
        <span style={{ width: 42 }} />
      </header>
      <section className="section">
        <div className="card">
          <span className="fine">{dayLabel(e.starts_at, tz, lang)} · {t.hour(parts(e.starts_at, tz).time)} · {e.club.name}</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 10px" }}>{e.title}</h2>
          {lines.map(({ t, qty }) => (
            <div className="sum" key={t.id}><span>{qty} × {t.name}</span><span>{money(qty * t.price, city.currency_symbol)}</span></div>
          ))}
          <div className="sum"><span>{t.serviceFee}</span><span>{money(fee, city.currency_symbol)}</span></div>
          <div className="sum total"><span>{t.total}</span><span>{money(subtotal + fee, city.currency_symbol)}</span></div>
        </div>
        <CheckoutForm eventId={e.id} items={lines.map(({ t, qty }) => ({ id: t.id, qty }))} totalLabel={money(subtotal + fee, city.currency_symbol)} defaultEmail={user?.email ?? ""} />
      </section>
    </main>
  );
}
