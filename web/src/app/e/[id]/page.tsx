import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TicketPicker from "./TicketPicker";
import { getCity, getEvent } from "@/lib/data";
import { dayLabel, parts, tzFor } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/e/[id]">) {
  const e = await getEvent((await params).id);
  return { title: e ? `${e.title} · la nit` : "la nit" };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();
  const city = await getCity(e.city_id);
  if (!city) notFound();
  const tz = tzFor(e.city_id);

  const p = parts(e.starts_at, tz);
  const kind = { club: "Noche de club", concierto: "Concierto", fiesta: "Fiesta" }[e.type] ?? TYPE_LABEL[e.type];

  return (
    <main className="shell event" style={{ paddingBottom: 120 }}>
      <div className="eposter ph">
        {e.image_url && <Image src={e.image_url} alt={`Flyer de ${e.title}`} fill priority sizes="(max-width: 900px) 100vw, 500px" />}
        <div className="bar">
          <Link className="icon-btn" href="/" aria-label="Volver a eventos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
        </div>
      </div>
      <div className="edet">
        <h1>{e.title}</h1>
        <p className="ekind">{kind}, solo mayores de {e.min_age}</p>
        <dl className="facts">
          <div><dt>Cuándo</dt><dd>{dayLabel(e.starts_at, tz)}<span>Abre a las {p.time} h</span></dd></div>
          <div><dt>Dónde</dt><dd>{e.club.name}<span>{[e.club.area, city.name].filter(Boolean).join(", ")}</span></dd></div>
          {e.dress_code && <div><dt>Dress code</dt><dd>{e.dress_code}</dd></div>}
          {e.lineup.length > 0 && <div><dt>Line-up</dt><dd>{e.lineup.join(", ")}</dd></div>}
        </dl>
        {e.description && <p className="desc">{e.description}</p>}
        <h2 className="etickets">Entradas</h2>
        <TicketPicker eventId={e.id} symbol={city.currency_symbol} tiers={e.ticket_types} />
      </div>
    </main>
  );
}
