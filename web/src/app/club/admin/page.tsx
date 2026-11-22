import { redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { switchClub, verifyClub } from "../actions";
import ClubTop from "../_ui/ClubTop";

export const metadata = { title: "Admin" };

type Row = { id: string; name: string; city_id: string; area: string | null; instagram: string | null; phone: string | null; verified: boolean; created_at: string; club_members: { user_id: string; role: string }[] };

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !(await isAdmin())) redirect("/club");
  const admin = supabaseAdmin();
  const { data } = await admin.from("clubs").select("id, name, city_id, area, instagram, phone, verified, created_at, club_members(user_id, role)").order("verified").order("created_at", { ascending: false });
  const clubs = (data as Row[]) ?? [];
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const email = Object.fromEntries((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <>
      <ClubTop active="admin" admin />
      <section className="section">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Clubs ({clubs.length})</h1>
        <p className="fine">Pendientes primero. Verifica solo cuando hayas confirmado que el club es real (Instagram, llamada o visita).</p>
      </section>
      <div className="list">
        {clubs.map((c) => {
          const owner = c.club_members.find((m) => m.role === "owner");
          return (
            <div className="card" key={c.id} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b style={{ fontSize: 17 }}>{c.name}</b> <span className={`st ${c.verified ? "st-published" : "st-draft"}`}>{c.verified ? "Verificado" : "Pendiente"}</span>
                  <div className="fine">{c.city_id}{c.area ? ` · ${c.area}` : ""} · {owner ? email[owner.user_id] : "sin dueño"}</div>
                  <div className="fine">
                    {c.instagram && <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>@{c.instagram}</a>}
                    {c.phone && <> · {c.phone}</>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <form action={verifyClub}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="verified" value={String(!c.verified)} />
                  <button className={`pill${c.verified ? "" : " gold"}`}>{c.verified ? "Quitar verificación" : "Verificar"}</button>
                </form>
                <form action={switchClub}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="pill">Abrir su panel</button>
                </form>
              </div>
            </div>
          );
        })}
        {!clubs.length && <div className="empty"><b>Aún no hay clubs</b>Cuando un club se registre aparecerá aquí.</div>}
      </div>
    </>
  );
}
