import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CityListing from "@/components/CityListing";
import { currentCity } from "@/lib/city";
import { getCities, getCityEvents } from "@/lib/data";
import { cityName } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const cities = await getCities();
  const { city } = await currentCity(cities);
  if (!city) return <main className="shell"><p className="section">{t.noCities}</p></main>;

  const events = await getCityEvents(city.id);
  const sel = typeof sp.d === "string" && /^\d+$/.test(sp.d) ? Number(sp.d) : null;
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

      <h1 className="sr-only">{t.partiesIn(cname)}</h1>
      <CityListing city={city} cities={cities} events={events} sel={sel} base="/" lang={lang} />
      <BottomNav />
    </main>
  );
}
