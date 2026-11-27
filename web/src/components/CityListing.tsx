import Link from "next/link";
import EventCard from "@/components/EventCard";
import { getUpcomingAll } from "@/lib/data";
import { dayOffset, parts, tzFor, weekdayShort } from "@/lib/format";
import { cityName, dict, type Lang } from "@/lib/i18n";
import type { City, EventItem } from "@/lib/types";

/**
 * Cartelera de una ciudad: calendario de 14 días, eventos por día y, si la ciudad
 * está vacía, lo próximo en otras ciudades (así la página nunca queda en blanco).
 */
export default async function CityListing({ city, cities, events, sel, base, lang }: {
  city: City; cities: City[]; events: EventItem[]; sel: number | null; base: string; lang: Lang;
}) {
  const t = dict(lang);
  const tz = tzFor(city.id);
  const shown = sel === null ? events : events.filter((e) => dayOffset(e.starts_at, tz) === sel);
  const groups: { key: string; top: string; bottom: string; items: EventItem[] }[] = [];
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
  const other = events.length ? [] : (await getUpcomingAll(8)).filter((e) => e.city_id !== city.id);
  const cityOf = (id: string) => cities.find((c) => c.id === id) ?? city;
  const q = (d: number) => `${base}${base.includes("?") ? "&" : "?"}d=${d}`;

  return (
    <>
      <div className="cal-head">
        <span>{m0 === m1 ? m0 : `${m0} – ${m1}`}</span>
        <span>{t.eventsCount(events.length)}</span>
      </div>
      <nav className="days" aria-label={t.calendar}>
        <Link href={base} className={`day all ${sel === null ? "on" : ""}`} aria-current={sel === null ? "true" : undefined}>{t.all}</Link>
        {days.map(({ i, d, has }) => (
          <Link key={i} href={sel === i ? base : q(i)} className={`day ${has ? "has" : "none"} ${sel === i ? "on" : ""}`} aria-current={sel === i ? "true" : undefined}>
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
          {sel === null ? t.noEventsSub(cname) : <Link href={base} style={{ textDecoration: "underline" }}>{t.seeAllDays}</Link>}
        </div>
      )}
      {other.length > 0 && (
        <section className="daygroup">
          <h2 className="dayhead"><b>{t.elsewhere}</b></h2>
          <div className="posters">{other.map((e) => <EventCard key={e.id} e={e} city={cityOf(e.city_id)} lang={lang} />)}</div>
        </section>
      )}
      <footer className="about">
        <p>{t.about}</p>
        <h2>{t.citiesTitle}</h2>
        <ul>
          {cities.map((c) => <li key={c.id}><Link href={`/fiestas/${c.id}`}>{cityName(c, lang)}</Link></li>)}
        </ul>
      </footer>
    </>
  );
}
