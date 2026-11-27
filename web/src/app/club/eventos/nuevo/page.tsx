import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { getCity } from "@/lib/data";
import ClubTop from "../../_ui/ClubTop";
import EventForm from "../../_ui/EventForm";
import { cityName } from "@/lib/i18n";
import { getT } from "@/lib/lang";

export const metadata = { title: { absolute: "la nit for clubs" } };

export default async function NewEvent() {
  const { user, club, admin } = await requireClub();
  const city = await getCity(club.city_id);
  const { lang, t } = await getT();
  return (
    <>
      <ClubTop active="panel" admin={admin} />
      <section className="section">
        <Link href="/club" className="fine">← {club.name}</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 4px" }}>{t.club.newTitle}</h1>
        <p className="fine" style={{ marginBottom: 18 }}>{t.club.tzNote(city ? cityName(city, lang) : club.city_id)}</p>
        <EventForm clubId={club.id} userId={user.id} currency={city?.currency_symbol ?? ""} verified={club.verified || admin} />
      </section>
    </>
  );
}
