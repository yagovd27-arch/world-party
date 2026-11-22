import Link from "next/link";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import { getCities, getCityEvents } from "@/lib/data";
import { dayLabel, dayOffset, MONTHS, parts, tzFor, weekdayShort } from "@/lib/format";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const cities = await getCities();
  const saved = (await cookies()).get("city")?.value;
  const city = cities.find((c) => c.id === saved) ?? cities[0];
  if (!city) return <main className="shell"><p className="section">No hay ciudades configuradas.</p></main>;

  const tz = tzFor(city.id);
  const events = await getCityEvents(city.id);
  const sel = typeof sp.d === "string" && /^\d+$/.test(sp.d) ? Number(sp.d) : null;
  const shown = sel === null ? events : events.filter((e) => dayOffset(e.starts_at, tz) === sel);

  const groups: { label: string; items: typeof shown }[] = [];
  for (const e of shown) {
    const label = dayLabel(e.starts_at, tz);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(e); else groups.push({ label, items: [e] });
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * 864e5);
    return { i, d, has: events.some((e) => dayOffset(e.starts_at, tz) === i) };
  });
  const m0 = MONTHS[parts(days[0].d, tz).month];
  const m1 = MONTHS[parts(days[13].d, tz).month];

  return (
    <main className="shell">
      <header className="top">
        <span className="logo">la nit<b>.</b></span>
        <Link className="pill" href="/ciudades">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          {city.name}
        </Link>
      </header>

      <div className="cal-head">
        <span>{m0 === m1 ? m0 : `${m0} – ${m1}`}</span>
        <span>{events.length} eventos</span>
      </div>
      <nav className="days" aria-label="Calendario">
        <Link href="/" className={`day all ${sel === null ? "on" : ""}`} aria-current={sel === null ? "true" : undefined}>Todo</Link>
        {days.map(({ i, d, has }) => (
          <Link key={i} href={sel === i ? "/" : `/?d=${i}`} className={`day ${has ? "has" : "none"} ${sel === i ? "on" : ""}`} aria-current={sel === i ? "true" : undefined}>
            <small>{i === 0 ? "hoy" : weekdayShort(d, tz)}</small>
            <b>{parts(d, tz).day}</b>
            <i />
          </Link>
        ))}
      </nav>

      {groups.length ? groups.map((g) => (
        <section key={g.label}>
          <h2 className="ghead">{g.label}</h2>
          <div className="list">{g.items.map((e) => <EventCard key={e.id} e={e} city={city} />)}</div>
        </section>
      )) : (
        <div className="list">
          <div className="empty"><b>Sin eventos {sel === null ? "por ahora" : "este día"}</b>
            {sel === null ? "Pronto habrá eventos en esta ciudad." : <Link href="/" className="scarce">Ver todos</Link>}
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
