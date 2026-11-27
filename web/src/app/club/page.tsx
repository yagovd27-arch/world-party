import Link from "next/link";
import { cookies } from "next/headers";
import LoginForm from "@/components/LoginForm";
import SubmitButton from "@/components/SubmitButton";
import { getCities } from "@/lib/data";
import { getCurrentClub, getUser, isAdmin } from "@/lib/auth";
import { dayLabel, money, parts, tzFor } from "@/lib/format";
import { isSupabaseOn, supabaseServer } from "@/lib/supabase/server";
import { createClub, switchClub } from "./actions";
import ClubTop from "./_ui/ClubTop";
import { cityName } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: { absolute: "la nit for clubs" }, description: t.club.metaDesc };
}

type Ev = {
  id: string; title: string; starts_at: string; status: string; city_id: string;
  ticket_types: { price: number; sold: number; capacity: number }[];
};


export default async function ClubHome({ searchParams }: PageProps<"/club">) {
  const sp = await searchParams;
  const err = typeof sp.e === "string" ? sp.e : "";
  const user = await getUser();
  const { lang, t } = await getT();
  const c = t.club;

  if (!user) {
    return (
      <>
        <ClubTop loggedIn={false} />
        <section className="section" style={{ maxWidth: 520 }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 48, fontWeight: 500, lineHeight: 1, letterSpacing: 0 }}>{c.heroTitle}</h1>
          <p className="desc">{c.heroDesc}</p>
          <dl className="facts" style={{ margin: "22px 0 26px" }}>
            <div><dt>{c.fSales}</dt><dd>{c.fSalesD}</dd></div>
            <div><dt>{c.fTickets}</dt><dd>{c.fTicketsD}</dd></div>
            <div><dt>{c.fDoor}</dt><dd>{c.fDoorD}</dd></div>
            <div><dt>{c.fCost}</dt><dd>{c.fCostD}</dd></div>
          </dl>
          {isSupabaseOn ? <LoginForm next="/club" cta={c.loginCta} /> : <p className="notice">{c.noDb}</p>}
        </section>
      </>
    );
  }

  const store = await cookies();
  const [{ club, mine }, admin] = await Promise.all([getCurrentClub(store.get("club")?.value), isAdmin()]);

  if (!club) {
    const cities = await getCities();
    return (
      <>
        <ClubTop admin={admin} />
        <section className="section" style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{c.registerTitle}</h1>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px" }}>{c.registerSub}</p>
          <form action={createClub}>
            <div className="field"><label htmlFor="name">{c.name}</label><input id="name" name="name" required maxLength={80} placeholder="Bergamo" /></div>
            <div className="row2">
              <div className="field">
                <label htmlFor="city">{c.city}</label>
                <select id="city" name="city" required defaultValue={cities.find((x) => x.id === "delhi")?.id ?? cities[0]?.id}>
                  {cities.map((x) => <option key={x.id} value={x.id}>{cityName(x, lang)}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="area">{c.area}</label><input id="area" name="area" maxLength={80} placeholder="Hauz Khas" /></div>
            </div>
            <div className="row2">
              <div className="field"><label htmlFor="instagram">Instagram</label><input id="instagram" name="instagram" maxLength={60} placeholder="@tuclub" /></div>
              <div className="field"><label htmlFor="phone">WhatsApp</label><input id="phone" name="phone" type="tel" maxLength={30} placeholder="+91 …" /></div>
            </div>
            <SubmitButton pendingText={c.registering}>{c.register}</SubmitButton>
            {err && <p className="error" role="alert">{err}</p>}
          </form>
          <p className="fine" style={{ marginTop: 18 }}>{c.session}: {user.email}</p>
        </section>
      </>
    );
  }

  const sb = await supabaseServer();
  const { data } = await sb
    .from("events")
    .select("id, title, starts_at, status, city_id, ticket_types(price, sold, capacity)")
    .eq("club_id", club.id)
    .order("starts_at", { ascending: false })
    .limit(100);
  const events = (data as Ev[]) ?? [];
  const { count: pendingUpi } = await sb.from("orders").select("id", { count: "exact", head: true })
    .in("event_id", events.map((e) => e.id).concat("00000000-0000-0000-0000-000000000000"))
    .eq("status", "pending").eq("payment_provider", "upi").not("provider_payment_id", "is", null);
  const cities = await getCities();
  const clubCity = cities.find((x) => x.id === club.city_id);
  const sym = clubCity?.currency_symbol ?? "";
  const cutoff = Date.now() - 12 * 3600e3;
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= cutoff).reverse();
  const past = events.filter((e) => Date.parse(e.starts_at) < cutoff);
  const sold = events.reduce((s, e) => s + e.ticket_types.reduce((a, t) => a + t.sold, 0), 0);
  const revenue = events.reduce((s, e) => s + e.ticket_types.reduce((a, t) => a + t.sold * t.price, 0), 0);

  const row = (e: Ev) => {
    const tz = tzFor(e.city_id);
    const s = e.ticket_types.reduce((a, t) => a + t.sold, 0);
    const cap = e.ticket_types.reduce((a, t) => a + t.capacity, 0);
    return (
      <Link key={e.id} href={`/club/eventos/${e.id}`} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 0 }}>
          <span className="fine">{dayLabel(e.starts_at, tz, lang)}, {t.hour(parts(e.starts_at, tz).time)}</span>
          <b style={{ display: "block", fontSize: 16 }}>{e.title}</b>
          <span className={`st st-${e.status}`}>{c.status[e.status]}</span>
        </span>
        <span style={{ textAlign: "right", flexShrink: 0 }}>
          <b style={{ display: "block" }}>{s}/{cap}</b>
          <span className="fine">{c.sold}</span>
        </span>
      </Link>
    );
  };

  return (
    <>
      <ClubTop active="panel" admin={admin} />
      <section className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="fine">{club.area ? `${club.area}, ` : ""}{clubCity ? cityName(clubCity, lang) : ""}</span>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{club.name}</h1>
          </div>
          <Link href="/club/eventos/nuevo" className="cta">{c.newEvent}</Link>
        </div>
        {mine.length > 1 && (
          <form action={switchClub} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <select name="id" defaultValue={club.id} className="pill" style={{ background: "var(--wine-700)" }}>
              {mine.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button className="pill">{c.switch}</button>
          </form>
        )}
        {(pendingUpi ?? 0) > 0 && <p className="notice">{t.upi.pendingNotice(pendingUpi ?? 0)}</p>}
        {!club.verified && (
          <p className="notice">{c.pending}</p>
        )}
        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><b>{upcoming.length}</b><span>{c.upcomingN}</span></div>
          <div className="stat"><b>{sold}</b><span>{c.ticketsSold}</span></div>
          <div className="stat"><b>{money(revenue, sym)}</b><span>{c.salesForClub}</span></div>
        </div>
      </section>
      <h2 className="ghead">{c.upcoming}</h2>
      <div className="list">
        {upcoming.length ? upcoming.map(row) : <div className="empty"><b>{c.noUpcoming}</b>{c.noUpcomingSub}</div>}
      </div>
      {past.length > 0 && (
        <>
          <h2 className="ghead">{c.past}</h2>
          <div className="list" style={{ opacity: 0.65 }}>{past.map(row)}</div>
        </>
      )}
    </>
  );
}
