import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TicketPicker from "./TicketPicker";
import { getCity, getEvent } from "@/lib/data";
import { dayLabel, parts, tzFor } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/e/[id]">) {
  const e = await getEvent((await params).id);
  return { title: e ? `${e.title} · denoche` : "denoche" };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();
  const city = await getCity(e.city_id);
  if (!city) notFound();
  const tz = tzFor(e.city_id);

  return (
    <main className="shell" style={{ paddingBottom: 120 }}>
      <div className="hero ph">
        {e.image_url && <Image src={e.image_url} alt={e.title} fill priority sizes="(max-width: 480px) 100vw, 480px" />}
        <span className="shade" />
        <div className="bar">
          <Link className="icon-btn" href="/" aria-label="Volver">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
        </div>
      </div>
      <div className="edet">
        <div style={{ display: "flex", gap: 6 }}>
          <span className="badge">{TYPE_LABEL[e.type]}</span>
          <span className="badge">{e.min_age}+</span>
          {e.club.verified && <span className="badge cream">Verificado</span>}
        </div>
        <h1>{e.title}</h1>
        <div className="facts">
          <div className="fact"><b>{dayLabel(e.starts_at, tz)}</b><span>{parts(e.starts_at, tz).time} h</span></div>
          <div className="fact"><b>{e.club.name}</b><span>{[e.club.area, city.name].filter(Boolean).join(", ")}</span></div>
        </div>
        {e.description && <p className="desc">{e.description}</p>}
        {e.dress_code && <p className="desc"><b>Dress code:</b> {e.dress_code}</p>}
        {e.lineup.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <span className="fine">Line-up</span>
            <div className="chips">{e.lineup.map((l) => <span key={l}>{l}</span>)}</div>
          </div>
        )}
        <h2 className="h2" style={{ marginTop: 26 }}>Entradas</h2>
        <TicketPicker eventId={e.id} symbol={city.currency_symbol} tiers={e.ticket_types} />
      </div>
    </main>
  );
}
