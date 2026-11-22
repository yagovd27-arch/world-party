import { redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { switchClub, verifyClub } from "../actions";
import ClubTop from "../_ui/ClubTop";
import { getT } from "@/lib/lang";

export const metadata = { title: "Admin" };

type Row = { id: string; name: string; city_id: string; area: string | null; instagram: string | null; phone: string | null; verified: boolean; created_at: string; club_members: { user_id: string; role: string }[] };

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !(await isAdmin())) redirect("/club");
  const c = (await getT()).t.club;
  const admin = supabaseAdmin();
  const { data } = await admin.from("clubs").select("id, name, city_id, area, instagram, phone, verified, created_at, club_members(user_id, role)").order("verified").order("created_at", { ascending: false });
  const clubs = (data as Row[]) ?? [];
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const email = Object.fromEntries((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <>
      <ClubTop active="admin" admin />
      <section className="section">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{c.clubsN(clubs.length)}</h1>
        <p className="fine">{c.adminNote}</p>
      </section>
      <div className="list">
        {clubs.map((cl) => {
          const owner = cl.club_members.find((m) => m.role === "owner");
          return (
            <div className="card" key={cl.id} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b style={{ fontSize: 17 }}>{cl.name}</b> <span className={`st ${cl.verified ? "st-published" : "st-draft"}`}>{cl.verified ? c.verified : c.pendingTag}</span>
                  <div className="fine">{cl.city_id}{cl.area ? ` · ${cl.area}` : ""} · {owner ? email[owner.user_id] : c.noOwner}</div>
                  <div className="fine">
                    {cl.instagram && <a href={`https://instagram.com/${cl.instagram}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>@{cl.instagram}</a>}
                    {cl.phone && <> · {cl.phone}</>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <form action={verifyClub}>
                  <input type="hidden" name="id" value={cl.id} />
                  <input type="hidden" name="verified" value={String(!cl.verified)} />
                  <button className={`pill${cl.verified ? "" : " gold"}`}>{cl.verified ? c.unverify : c.verify}</button>
                </form>
                <form action={switchClub}>
                  <input type="hidden" name="id" value={cl.id} />
                  <button className="pill">{c.openPanel}</button>
                </form>
              </div>
            </div>
          );
        })}
        {!clubs.length && <div className="empty"><b>{c.noClubs}</b>{c.noClubsSub}</div>}
      </div>
    </>
  );
}
