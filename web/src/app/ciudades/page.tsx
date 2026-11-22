import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";
import { getCities, getEventCounts } from "@/lib/data";

export default async function Cities() {
  const [cities, counts] = await Promise.all([getCities(), getEventCounts()]);
  const current = (await cookies()).get("city")?.value;
  return (
    <main className="shell">
      <header className="top">
        <Link className="icon-btn" href="/" aria-label="Volver">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className="logo" style={{ fontSize: 20 }}>Elige ciudad</span>
        <span style={{ width: 42 }} />
      </header>
      <section className="section">
        <div className="cities">
          {cities.map((c, i) => (
            <Link key={c.id} href={`/c/${c.id}`} prefetch={false} className={`city ph ${i === 0 ? "wide" : ""}`}>
              {c.image_url && <Image src={c.image_url} alt={c.name} fill sizes="(max-width: 480px) 100vw, 480px" />}
              <span className="shade" />
              {c.id === current && <span className="badge cream tag">Tu ciudad</span>}
              <span className="lbl"><b>{c.name}</b><span>{c.country} · {counts[c.id] ?? 0} eventos</span></span>
            </Link>
          ))}
        </div>
        <p className="fine" style={{ marginTop: 18, textAlign: "center" }}>¿Tu ciudad no está? Pronto llegamos a más ciudades.</p>
      </section>
      <BottomNav />
    </main>
  );
}
