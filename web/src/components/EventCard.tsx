import Image from "next/image";
import Link from "next/link";
import { money, parts, tzFor } from "@/lib/format";
import type { City, EventItem } from "@/lib/types";

export function fromPrice(e: EventItem) {
  const open = e.ticket_types.filter((t) => t.sold < t.capacity);
  return open.length ? Math.min(...open.map((t) => t.price)) : null;
}

/** Un evento en la cartelera: el flyer manda. */
export default function EventCard({ e, city }: { e: EventItem; city: City }) {
  const from = fromPrice(e);
  const early = e.ticket_types.find((t) => /early/i.test(t.name));
  const left = early ? early.capacity - early.sold : 0;
  return (
    <Link className="poster" href={`/e/${e.id}`}>
      <div className="ph">
        {e.image_url && <Image src={e.image_url} alt={`Flyer de ${e.title}`} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 45vw, 340px" />}
      </div>
      <h3 className="poster-title">{e.title}</h3>
      <p className="poster-place">
        <b>{parts(e.starts_at, tzFor(e.city_id)).time} h</b>
        <span>{e.club.area || e.club.name}</span>
      </p>
      <p className="poster-buy">
        <span className="price">{from === null ? "Agotado" : `Desde ${money(from, city.currency_symbol)}`}</span>
        {left > 0 && left < 20 && <span className="scarce">Quedan {left} early bird</span>}
      </p>
    </Link>
  );
}
