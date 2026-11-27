import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth";
import { getCity } from "@/lib/data";
import { tzFor, utcToLocalInput } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import ClubTop from "../../../_ui/ClubTop";
import EventForm from "../../../_ui/EventForm";
import { getT } from "@/lib/lang";

export const metadata = { title: { absolute: "la nit for clubs" } };

type Row = {
  id: string; club_id: string; city_id: string; title: string; description: string | null; lineup: string[]; type: string;
  starts_at: string; image_url: string | null; min_age: number; dress_code: string | null; status: string;
  ticket_types: { id: string; name: string; description: string | null; price: number; capacity: number; sold: number; sales_end: string | null; sort: number; pr_discount?: number }[];
};

export default async function EditEvent({ params }: PageProps<"/club/eventos/[id]/editar">) {
  const { id } = await params;
  const { user, club, admin } = await requireClub();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServer();
  const { data } = await sb.from("events").select("*, ticket_types(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as Row;
  const tz = tzFor(e.city_id);
  const city = await getCity(e.city_id);
  const { t } = await getT();
  const tiers = [...e.ticket_types].sort((a, b) => a.sort - b.sort);

  return (
    <>
      <ClubTop active="panel" admin={admin} />
      <section className="section">
        <Link href={`/club/eventos/${e.id}`} className="fine">← {e.title}</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 18px" }}>{t.club.editTitle}</h1>
        <EventForm
          clubId={e.club_id}
          userId={user.id}
          currency={city?.currency_symbol ?? ""}
          verified={club.verified || admin}
          initial={{
            id: e.id, title: e.title, description: e.description ?? "", lineup: e.lineup.join(", "), type: e.type,
            startsLocal: utcToLocalInput(e.starts_at, tz), imageUrl: e.image_url ?? "", minAge: e.min_age, dressCode: e.dress_code ?? "",
            status: e.status,
            tiers: tiers.map((t) => ({ id: t.id, name: t.name, description: t.description ?? "", price: t.price, capacity: t.capacity, prDiscount: t.pr_discount ?? 0, salesEnd: t.sales_end ? utcToLocalInput(t.sales_end, tz) : "" })),
            sold: Object.fromEntries(tiers.map((t) => [t.id, t.sold])),
          }}
        />
      </section>
    </>
  );
}
