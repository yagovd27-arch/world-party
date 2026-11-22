import Image from "next/image";
import Link from "next/link";
import { money, parts, tzFor } from "@/lib/format";
import type { City, EventItem } from "@/lib/types";

export function fromPrice(e: EventItem) {
  const open = e.ticket_types.filter((t) => t.sold < t.capacity);
  return open.length ? Math.min(...open.map((t) => t.price)) : null;
}

/** Tarjeta compacta de la cartelera: flyer, nombre, club y precio. */
export default function EventCard({ e, city }: { e: EventItem; city: City }) {
  const from = fromPrice(e);
  const early = e.ticket_types.find((t) => /early/i.test(t.name));
  const left = early ? early.capacity - early.sold : 0;
  return (
    <Link className="ecard" href={`/e/${e.id}`}>
      <div className="ph">
        {e.image_url && <Image src={e.image_url} alt={`Flyer de ${e.title}`} fill sizes="(max-width: 760px) 50vw, (max-width: 1000px) 33vw, 280px" />}
        {left > 0 && left < 20 && <span className="badge tag">Quedan {left}</span>}
      </div>
      <div className="ecard-body">
        <h3>{e.title}</h3>
        <p className="ecard-place">{e.club.name}{e.club.area ? `, ${e.club.area}` : ""}</p>
        <p className="ecard-meta">
          <span>{parts(e.starts_at, tzFor(e.city_id)).time} h</span>
          <span className="price">{from === null ? "Agotado" : `Desde ${money(from, city.currency_symbol)}`}</span>
        </p>
      </div>
    </Link>
  );
}
