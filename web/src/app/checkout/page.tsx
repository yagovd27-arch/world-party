import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutForm from "./CheckoutForm";
import { getUser, isAdmin } from "@/lib/auth";
import { getCity, getEvent } from "@/lib/data";
import { dayLabel, money, parts, serviceFee, tzFor } from "@/lib/format";
import { feeRateFor } from "@/lib/types";
import { getPromoterByCode } from "@/lib/promoters";
import { getT } from "@/lib/lang";
import { canSell, payMethods } from "@/lib/payments";
import { legalReady } from "@/lib/legal";
import { cookies } from "next/headers";

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
  const prOff = lines.reduce((s, l) => s + l.qty * Math.min(l.t.pr_discount ?? 0, l.t.price), 0);
  const tz = tzFor(e.city_id);
  const user = await getUser();
  const { lang, t } = await getT();
  const admin = await isAdmin();
  const pr = (await cookies()).get("pr")?.value ?? "";
  const promoOk = /^[A-Z0-9]{3,16}$/.test(pr) && Boolean(await getPromoterByCode(pr));

  return (
    <main className="shell">
      <header className="top">
        <Link className="icon-btn" href={`/e/${e.id}`} aria-label={t.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="logo" style={{ fontSize: 20 }}>{t.pay}</span>
        <Link className="icon-btn homebtn" href="/" aria-label="la nit">la nit<b>.</b></Link>
      </header>
      <section className="section">
        <div className="card">
          <span className="fine">{dayLabel(e.starts_at, tz, lang)}, {t.hour(parts(e.starts_at, tz).time)}, {e.club.name}</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 10px" }}>{e.title}</h2>
          {lines.map(({ t, qty }) => (
            <div className="sum" key={t.id}><span>{qty} × {t.name}</span><span>{money(qty * t.price, city.currency_symbol)}</span></div>
          ))}
        </div>
        {!canSell(city.currency, admin) ? <p className="notice">{t.salesSoon}</p> : <CheckoutForm eventId={e.id} items={lines.map(({ t, qty }) => ({ id: t.id, qty }))} subtotal={subtotal} prOff={prOff} feeRate={feeRateFor(e.club)} symbol={city.currency_symbol} defaultEmail={user?.email ?? ""} defaultPromo={promoOk ? pr : ""} defaultPromoOk={promoOk} methods={payMethods(city.currency, admin)} note={payMethods(city.currency, admin).includes("card") ? t.cardNote : payMethods(city.currency, admin)[0] === "upi" ? t.upi.checkoutNote : undefined} />}
        {legalReady && (
          <p className="fine" style={{ marginTop: 10, textAlign: "center" }}>
            {t.acceptTerms} <Link href="/terms" style={{ textDecoration: "underline" }}>{t.termsLink}</Link>, <Link href="/refunds" style={{ textDecoration: "underline" }}>{t.refundsLink}</Link>
          </p>
        )}
      </section>
    </main>
  );
}
