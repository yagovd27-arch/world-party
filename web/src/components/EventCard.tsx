import Image from "next/image";
import Link from "next/link";
import { money, parts, tzFor } from "@/lib/format";
import type { City, EventItem } from "@/lib/types";

export function fromPrice(e: EventItem) {
  const open = e.ticket_types.filter((t) => t.sold < t.capacity);
  return open.length ? Math.min(...open.map((t) => t.price)) : null;
}

export default function EventCard({ e, city }: { e: EventItem; city: City }) {
  const from = fromPrice(e);
  const early = e.ticket_types.find((t) => /early/i.test(t.name));
  const left = early ? early.capacity - early.sold : 0;
  return (
    <Link className="ecard" href={`/e/${e.id}`}>
      <div className="ph">
        {e.image_url && <Image src={e.image_url} alt="" fill sizes="92px" />}
      </div>
      <div className="body">
        <span className="when">{parts(e.starts_at, tzFor(e.city_id)).time} h</span>
        <h3>{e.title}</h3>
        <p className="sub">{e.club.name}{e.club.area ? ` · ${e.club.area}` : ""}</p>
        <div className="foot">
          <span className="price">{from === null ? "Agotado" : money(from, city.currency_symbol)}</span>
          {left > 0 && left < 20 && <span className="scarce">Últimas early bird</span>}
        </div>
      </div>
    </Link>
  );
}
