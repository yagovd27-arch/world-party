import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseOn, supabaseServer } from "./supabase/server";

export type Club = {
  id: string; name: string; city_id: string; area: string | null; address: string | null;
  instagram: string | null; phone: string | null; verified: boolean;
};

/** Usuario con sesión iniciada, o null. */
export async function getUser() {
  await connection();
  if (!isSupabaseOn) return null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("is_platform_admin");
  return data === true;
}

/** Clubs que gestiona el usuario (como dueño, manager o puerta). */
export async function getMyClubs(): Promise<(Club & { role: string })[]> {
  const user = await getUser();
  if (!user) return [];
  const sb = await supabaseServer();
  const { data } = await sb
    .from("club_members")
    .select("role, club:clubs(id, name, city_id, area, address, instagram, phone, verified)")
    .eq("user_id", user.id);
  return ((data ?? []) as unknown as { role: string; club: Club }[])
    .filter((r) => r.club)
    .map((r) => ({ ...r.club, role: r.role }));
}

/** Club con el que está trabajando el usuario ahora mismo (cookie "club"). */
export async function getCurrentClub(clubCookie: string | undefined) {
  const mine = await getMyClubs();
  const pick = mine.find((c) => c.id === clubCookie);
  if (pick) return { club: pick, mine };
  if (clubCookie && /^[0-9a-f-]{36}$/i.test(clubCookie) && (await isAdmin())) {
    const sb = await supabaseServer();
    const { data } = await sb.from("clubs").select("id, name, city_id, area, address, instagram, phone, verified").eq("id", clubCookie).maybeSingle();
    if (data) return { club: { ...(data as Club), role: "admin" }, mine };
  }
  return { club: mine[0] ?? null, mine };
}

/** Para páginas del panel: exige sesión y club; si no, vuelve a /club. */
export async function requireClub() {
  const user = await getUser();
  if (!user) redirect("/club");
  const { club } = await getCurrentClub((await cookies()).get("club")?.value);
  if (!club) redirect("/club");
  return { user, club, admin: await isAdmin() };
}
