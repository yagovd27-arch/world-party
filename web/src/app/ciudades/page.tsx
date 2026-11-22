import Image from "next/image";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { currentCity } from "@/lib/city";
import { getCities, getEventCounts } from "@/lib/data";
import { cityName, countryName } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export default async function Cities() {
  const [cities, counts] = await Promise.all([getCities(), getEventCounts()]);
  const current = (await currentCity(cities)).city?.id;
  const { lang, t } = await getT();
  return (
    <main className="shell">
      <header className="top">
        <Link className="icon-btn" href="/" aria-label={t.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="logo" style={{ fontSize: 20 }}>{t.chooseCity}</span>
        <span style={{ width: 42 }} />
      </header>
      <section className="section">
        <div className="cities">
          {cities.map((c) => (
            <Link key={c.id} href={`/c/${c.id}`} prefetch={false} className="city ph">
              {c.image_url && <Image src={c.image_url} alt={cityName(c, lang)} fill sizes="(max-width: 560px) 50vw, 270px" />}
              <span className="shade" />
              {c.id === current && <span className="badge cream tag">{t.yourCity}</span>}
              <span className="lbl"><b>{cityName(c, lang)}</b><span>{t.cityEvents(countryName(c.country, lang), counts[c.id] ?? 0)}</span></span>
            </Link>
          ))}
        </div>
        <p className="fine" style={{ marginTop: 18, textAlign: "center" }}>{t.cityMissing}</p>
      </section>
      <BottomNav />
    </main>
  );
}
