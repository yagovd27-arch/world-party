import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import { currentCity } from "@/lib/city";
import { getCities, getCityEvents } from "@/lib/data";
import { dayOffset, parts, tzFor, weekdayShort } from "@/lib/format";
import { cityName } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const cities = await getCities();
  const { city } = await currentCity(cities);
  if (!city) return <main className="shell"><p className="section">{t.noCities}</p></main>;

  const tz = tzFor(city.id);
  const events = await getCityEvents(city.id);
  const sel = typeof sp.d === "string" && /^\d+$/.test(sp.d) ? Number(sp.d) : null;
  const shown = sel === null ? events : events.filter((e) => dayOffset(e.starts_at, tz) === sel);

  const groups: { key: string; top: string; bottom: string; items: typeof shown }[] = [];
  for (const e of shown) {
    const p = parts(e.starts_at, tz);
    const off = dayOffset(e.starts_at, tz);
    const g = groups.find((x) => x.key === p.ymd);
    if (g) { g.items.push(e); continue; }
    groups.push({
      key: p.ymd,
      top: off === 0 ? t.today : off === 1 ? t.tomorrow : t.wdLong[p.weekday],
      bottom: off <= 1 ? t.weekdayDay(t.wdLong[p.weekday], p.day, t.moLong[p.month]) : t.dayOfMonth(p.day, t.moLong[p.month]),
      items: [e],
    });
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * 864e5);
    return { i, d, has: events.some((e) => dayOffset(e.starts_at, tz) === i) };
  });
  const m0 = t.moLong[parts(days[0].d, tz).month];
  const m1 = t.moLong[parts(days[13].d, tz).month];
  const cname = cityName(city, lang);

  return (
    <main className="shell home">
      <header className="top">
        <span className="logo">la nit<b>.</b></span>
        <nav className="topnav" aria-label={t.nav.main}>
          <Link href="/" className="on" aria-current="page">{t.nav.events}</Link>
          <Link href="/entradas">{t.nav.myTickets}</Link>
          <Link href="/perfil">{t.nav.profile}</Link>
        </nav>
        <div className="topright">
          <LangSwitch />
          <Link className="citybtn" href="/ciudades" aria-label={t.cityAria(cname)}>
          {cname}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </Link>
        </div>
      </header>

      <div className="cal-head">
        <span>{m0 === m1 ? m0 : `${m0} – ${m1}`}</span>
        <span>{t.eventsCount(events.length)}</span>
      </div>
      <nav className="days" aria-label={t.calendar}>
        <Link href="/" className={`day all ${sel === null ? "on" : ""}`} aria-current={sel === null ? "true" : undefined}>{t.all}</Link>
        {days.map(({ i, d, has }) => (
          <Link key={i} href={sel === i ? "/" : `/?d=${i}`} className={`day ${has ? "has" : "none"} ${sel === i ? "on" : ""}`} aria-current={sel === i ? "true" : undefined}>
            <small>{i === 0 ? t.todayLower : weekdayShort(d, tz, lang)}</small>
            <b>{parts(d, tz).day}</b>
          </Link>
        ))}
      </nav>

      {groups.length ? groups.map((g) => (
        <section key={g.key} className="daygroup" aria-label={`${g.top}, ${g.bottom}`}>
          <h2 className="dayhead"><b>{g.top}</b><span>{g.bottom}</span></h2>
          <div className="posters">{g.items.map((e) => <EventCard key={e.id} e={e} city={city} lang={lang} />)}</div>
        </section>
      )) : (
        <div className="empty section">
          <b>{sel === null ? t.noEvents : t.nothingDay}</b>
          {sel === null ? t.noEventsSub(cname) : <Link href="/" style={{ textDecoration: "underline" }}>{t.seeAllDays}</Link>}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
