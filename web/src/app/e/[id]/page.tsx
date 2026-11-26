import Image from "next/image";
import Link from "next/link";
import Pin from "@/components/Pin";
import { notFound } from "next/navigation";
import TicketPicker from "./TicketPicker";
import { canSell } from "@/lib/payments";
import { getCity, getEvent } from "@/lib/data";
import { dayLabel, parts, tzFor } from "@/lib/format";
import { cityName } from "@/lib/i18n";
import { isAdmin } from "@/lib/auth";
import { getT } from "@/lib/lang";

export async function generateMetadata({ params }: PageProps<"/e/[id]">) {
  const e = await getEvent((await params).id);
  if (!e) return { title: "la nit" };
  const { lang, t } = await getT();
  const city = await getCity(e.city_id);
  const tz = tzFor(e.city_id);
  const desc = [dayLabel(e.starts_at, tz, lang), e.club.name, city ? cityName(city, lang) : ""].filter(Boolean).join(" · ");
  return {
    title: `${e.title} · la nit`,
    description: e.description ? `${desc}. ${e.description.slice(0, 140)}` : desc,
    alternates: { canonical: `/e/${e.id}` },
    openGraph: { title: e.title, description: desc, type: "website", url: `/e/${e.id}`, images: e.image_url ? [{ url: e.image_url, alt: t.flyerOf(e.title) }] : undefined },
    twitter: { card: e.image_url ? "summary_large_image" : "summary", title: e.title, description: desc, images: e.image_url ? [e.image_url] : undefined },
  };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();
  const city = await getCity(e.city_id);
  if (!city) notFound();
  const tz = tzFor(e.city_id);
  const { lang, t } = await getT();
  const cname = cityName(city, lang);
  const ig = e.club.instagram?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") || "";

  const p = parts(e.starts_at, tz);
  const kind = t.kind[e.type] ?? e.type;

  return (
    <main className="shell event" style={{ paddingBottom: 120 }}>
      <div className="eposter ph">
        {e.image_url && <Image src={e.image_url} alt={t.flyerOf(e.title)} fill priority sizes="(max-width: 900px) 100vw, 500px" />}
        <div className="bar">
          <Link className="icon-btn" href="/" aria-label={t.backToEvents}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
        </div>
      </div>
      <div className="edet">
        <h1>{e.title}</h1>
        <p className="ekind">{t.adultsOnly(kind, e.min_age)}</p>
        <a className="place" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.club.name, e.club.address || e.club.area, cname].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer">
          <span className="place-ic"><Pin size={18} /></span>
          <span className="place-tx">
            <b>{e.club.name}</b>
            <span>{[e.club.address || e.club.area, cname].filter(Boolean).join(", ")}</span>
          </span>
          <span className="place-go">{t.seeMap}</span>
        </a>
        <dl className="facts">
          <div><dt>{t.when}</dt><dd>{dayLabel(e.starts_at, tz, lang)}<span>{t.doorsAt(p.time)}</span></dd></div>
          {ig && (
            <div><dt>Instagram</dt><dd><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>@{ig}</a></dd></div>
          )}
          {e.dress_code && <div><dt>{t.dressCode}</dt><dd>{e.dress_code}</dd></div>}
          {e.lineup.length > 0 && <div><dt>{t.lineup}</dt><dd>{e.lineup.join(", ")}</dd></div>}
        </dl>
        {e.description && <p className="desc">{e.description}</p>}
        <h2 className="etickets">{t.tickets}</h2>
        <TicketPicker eventId={e.id} symbol={city.currency_symbol} tiers={e.ticket_types} salesOn={canSell(city.currency, await isAdmin())} />
      </div>
    </main>
  );
}
