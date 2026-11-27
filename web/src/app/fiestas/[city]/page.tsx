import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import CityListing from "@/components/CityListing";
import LangSwitch from "@/components/LangSwitch";
import { getCities, getCityEvents } from "@/lib/data";
import { cityName } from "@/lib/i18n";
import { getT } from "@/lib/lang";

/** Página de cada ciudad (lanit.club/fiestas/delhi): la que encuentra Google al buscar "fiestas en Delhi". */
export async function generateMetadata({ params }: PageProps<"/fiestas/[city]">) {
  const { city: id } = await params;
  const { lang, t } = await getT();
  const city = (await getCities()).find((c) => c.id === id);
  if (!city) return {};
  const n = cityName(city, lang);
  return { title: t.cityMetaTitle(n), description: t.cityMetaDesc(n), alternates: { canonical: `https://www.lanit.club/fiestas/${city.id}` } };
}

export default async function CityPage({ params, searchParams }: PageProps<"/fiestas/[city]">) {
  const [{ city: id }, sp] = await Promise.all([params, searchParams]);
  const { lang, t } = await getT();
  const cities = await getCities();
  const city = cities.find((c) => c.id === id);
  if (!city) notFound();
  const events = await getCityEvents(city.id);
  const sel = typeof sp.d === "string" && /^\d+$/.test(sp.d) ? Number(sp.d) : null;
  const cname = cityName(city, lang);

  return (
    <main className="shell home">
      <header className="top">
        <Link href="/" className="logo">la nit<b>.</b></Link>
        <nav className="topnav" aria-label={t.nav.main}>
          <Link href="/">{t.nav.events}</Link>
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
      <h1 className="cityh1">{t.partiesIn(cname)}</h1>
      <CityListing city={city} cities={cities} events={events} sel={sel} base={`/fiestas/${city.id}`} lang={lang} />
      <BottomNav />
    </main>
  );
}
