import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import { currentCity } from "@/lib/city";
import { getCities, getCityEvents } from "@/lib/data";
import { dayOffset, MONTHS, parts, tzFor, weekdayShort, WEEKDAYS_LONG } from "@/lib/format";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const cities = await getCities();
  const { city } = await currentCity(cities);
  if (!city) return <main className="shell"><p className="section">No hay ciudades configuradas.</p></main>;

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
      top: off === 0 ? "Hoy" : off === 1 ? "Mañana" : WEEKDAYS_LONG[p.weekday],
      bottom: off <= 1 ? `${WEEKDAYS_LONG[p.weekday]} ${p.day} de ${MONTHS[p.month]}` : `${p.day} de ${MONTHS[p.month]}`,
      items: [e],
    });
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * 864e5);
    return { i, d, has: events.some((e) => dayOffset(e.starts_at, tz) === i) };
  });
  const m0 = MONTHS[parts(days[0].d, tz).month];
  const m1 = MONTHS[parts(days[13].d, tz).month];

  return (
    <main className="shell home">
      <header className="top">
        <span className="logo">la nit<b>.</b></span>
        <nav className="topnav" aria-label="Principal">
          <Link href="/" className="on" aria-current="page">Eventos</Link>
          <Link href="/entradas">Mis entradas</Link>
          <Link href="/perfil">Perfil</Link>
        </nav>
        <Link className="citybtn" href="/ciudades" aria-label={`Ciudad: ${city.name}. Cambiar ciudad`}>
          {city.name}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </Link>
      </header>

      <div className="cal-head">
        <span>{m0 === m1 ? m0 : `${m0} – ${m1}`}</span>
        <span>{events.length === 1 ? "1 evento" : `${events.length} eventos`}</span>
      </div>
      <nav className="days" aria-label="Calendario">
        <Link href="/" className={`day all ${sel === null ? "on" : ""}`} aria-current={sel === null ? "true" : undefined}>Todo</Link>
        {days.map(({ i, d, has }) => (
          <Link key={i} href={sel === i ? "/" : `/?d=${i}`} className={`day ${has ? "has" : "none"} ${sel === i ? "on" : ""}`} aria-current={sel === i ? "true" : undefined}>
            <small>{i === 0 ? "hoy" : weekdayShort(d, tz)}</small>
            <b>{parts(d, tz).day}</b>
          </Link>
        ))}
      </nav>

      {groups.length ? groups.map((g) => (
        <section key={g.key} className="daygroup" aria-label={`${g.top}, ${g.bottom}`}>
          <h2 className="dayhead"><b>{g.top}</b><span>{g.bottom}</span></h2>
          <div className="posters">{g.items.map((e) => <EventCard key={e.id} e={e} city={city} />)}</div>
        </section>
      )) : (
        <div className="empty section">
          <b>{sel === null ? "Aún no hay eventos" : "Nada este día"}</b>
          {sel === null ? `Los clubs de ${city.name} están subiendo sus fechas.` : <Link href="/" style={{ textDecoration: "underline" }}>Ver todos los días</Link>}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
