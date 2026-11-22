"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { tzFor, zonedToUtc } from "@/lib/format";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const UUID = /^[0-9a-f-]{36}$/i;

/** Alta de un club u organizador. Queda pendiente de verificar. */
export async function createClub(form: FormData) {
  const user = await getUser();
  if (!user) {
    console.error("[createClub] sin sesión");
    redirect("/club?e=" + encodeURIComponent("Tu sesión ha caducado. Vuelve a entrar."));
  }
  const name = str(form, "name", 80);
  const city_id = str(form, "city", 40);
  const area = str(form, "area", 80) || null;
  const instagram = str(form, "instagram", 60).replace(/^@/, "") || null;
  const phone = str(form, "phone", 30) || null;
  if (name.length < 2 || !city_id) redirect("/club?e=" + encodeURIComponent("Escribe el nombre y elige la ciudad."));

  const admin = supabaseAdmin();
  const { count } = await admin.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner");
  if ((count ?? 0) >= 5) redirect("/club?e=" + encodeURIComponent("Ya tienes 5 clubs registrados."));

  const { data: club, error } = await admin.from("clubs").insert({ name, city_id, area, instagram, phone }).select("id").single();
  if (error || !club) {
    console.error("[createClub] insert club", error);
    redirect("/club?e=" + encodeURIComponent("No se pudo registrar: " + (error?.message ?? "error desconocido")));
  }
  const { error: memberErr } = await admin.from("club_members").insert({ club_id: club.id, user_id: user.id, role: "owner" });
  if (memberErr) console.error("[createClub] insert member", memberErr);
  (await cookies()).set("club", club.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/club");
}

export type TierInput = { id?: string; name: string; description: string; price: number; capacity: number; salesEnd: string };
export type EventInput = {
  id?: string; clubId: string; title: string; description: string; lineup: string; type: string;
  startsLocal: string; imageUrl: string; minAge: number; dressCode: string; publish: "keep" | "draft" | "publish"; tiers: TierInput[];
};

/** Crear o editar un evento con sus tipos de entrada. Las reglas de seguridad comprueban que el usuario es del club. */
export async function saveEvent(input: EventInput): Promise<{ ok: true; id: string; note?: string } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar." };
  if (!UUID.test(input.clubId) || (input.id && !UUID.test(input.id))) return { ok: false, error: "Datos no válidos." };

  const sb = await supabaseServer();
  const { data: club } = await sb.from("clubs").select("id, city_id, verified").eq("id", input.clubId).maybeSingle();
  if (!club) return { ok: false, error: "Club no encontrado." };

  const title = input.title.trim().slice(0, 90);
  if (title.length < 2) return { ok: false, error: "Ponle un nombre al evento." };
  const starts = zonedToUtc(input.startsLocal, tzFor(club.city_id));
  if (!starts) return { ok: false, error: "Elige la fecha y la hora." };
  if (!input.id && Date.parse(starts) < Date.now() - 3600e3) return { ok: false, error: "La fecha ya ha pasado." };
  if (!["club", "concierto", "fiesta"].includes(input.type)) return { ok: false, error: "Tipo de evento no válido." };
  const imageUrl = input.imageUrl.trim();
  if (imageUrl && !/^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/event-images\//i.test(imageUrl)) {
    return { ok: false, error: "Foto no válida." };
  }

  const tiers = input.tiers
    .map((t, i) => ({
      id: t.id && UUID.test(t.id) ? t.id : undefined,
      name: t.name.trim().slice(0, 40),
      description: t.description.trim().slice(0, 120) || null,
      price: Math.round(Number(t.price)),
      capacity: Math.round(Number(t.capacity)),
      sales_end: t.salesEnd ? zonedToUtc(t.salesEnd, tzFor(club.city_id)) : null,
      sort: i,
    }));
  if (!tiers.length) return { ok: false, error: "Añade al menos un tipo de entrada." };
  for (const t of tiers) {
    if (!t.name) return { ok: false, error: "Cada entrada necesita un nombre (Early bird, General, VIP…)." };
    if (!Number.isFinite(t.price) || t.price < 0 || t.price > 1_000_000) return { ok: false, error: `Precio no válido en “${t.name}”.` };
    if (!Number.isFinite(t.capacity) || t.capacity < 1 || t.capacity > 100_000) return { ok: false, error: `Cupo no válido en “${t.name}”.` };
  }

  const row = {
    club_id: club.id,
    city_id: club.city_id,
    title,
    description: input.description.trim().slice(0, 2000) || null,
    lineup: input.lineup.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
    type: input.type,
    starts_at: starts,
    image_url: imageUrl || null,
    min_age: Math.min(99, Math.max(0, Math.round(Number(input.minAge) || 18))),
    dress_code: input.dressCode.trim().slice(0, 80) || null,
  };

  const canPublish = club.verified || (await isAdmin());
  const wantPublish = input.publish === "publish" && canPublish;
  const statusPatch = input.publish === "draft" ? { status: "draft" } : wantPublish ? { status: "published" } : {};
  let eventId = input.id;

  if (eventId) {
    const { error } = await sb.from("events").update({ ...row, ...statusPatch }).eq("id", eventId);
    if (error) return { ok: false, error: "No se pudo guardar el evento." };
  } else {
    const { data, error } = await sb.from("events").insert({ ...row, status: wantPublish ? "published" : "draft" }).select("id").single();
    if (error || !data) return { ok: false, error: "No se pudo crear el evento." };
    eventId = data.id as string;
  }

  // Tipos de entrada: actualizar, crear y borrar los quitados (si no tienen ventas).
  const { data: current } = await sb.from("ticket_types").select("id, sold, name").eq("event_id", eventId);
  const keep = new Set(tiers.filter((t) => t.id).map((t) => t.id));
  for (const old of current ?? []) {
    if (!keep.has(old.id)) {
      if (old.sold > 0) return { ok: false, error: `“${old.name}” ya tiene ventas: no se puede quitar. Pon el cupo igual a las vendidas para cerrarla.` };
      await sb.from("ticket_types").delete().eq("id", old.id);
    }
  }
  for (const t of tiers) {
    const was = current?.find((c) => c.id === t.id);
    if (was && t.capacity < was.sold) return { ok: false, error: `“${t.name}”: el cupo no puede ser menor que las ya vendidas (${was.sold}).` };
    const { id, ...vals } = t;
    const res = id && was
      ? await sb.from("ticket_types").update(vals).eq("id", id)
      : await sb.from("ticket_types").insert({ ...vals, event_id: eventId });
    if (res.error) return { ok: false, error: "No se pudieron guardar las entradas." };
  }

  revalidatePath("/club");
  revalidatePath("/");
  const note = input.publish === "publish" && !canPublish ? "Guardado como borrador: podrás publicar en cuanto verifiquemos tu club." : undefined;
  return { ok: true, id: eventId!, note };
}

/** Publicar, despublicar o cancelar un evento. */
export async function setEventStatus(form: FormData) {
  const id = str(form, "id", 40);
  const status = str(form, "status", 20);
  if (!UUID.test(id) || !["draft", "published", "cancelled"].includes(status)) return;
  const sb = await supabaseServer();
  const { error } = await sb.from("events").update({ status }).eq("id", id);
  revalidatePath("/club");
  revalidatePath("/");
  redirect(`/club/eventos/${id}${error ? "?e=" + encodeURIComponent(/club_not_verified/.test(error.message) ? "Tu club aún no está verificado: te avisamos en cuanto lo esté." : "No se pudo cambiar el estado.") : ""}`);
}

/** Escanear un QR en la puerta. */
export async function scanTicket(code: string) {
  const user = await getUser();
  if (!user) return { ok: false, reason: "login" } as const;
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (clean.length < 6) return { ok: false, reason: "not_found" } as const;
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("scan_ticket", { ticket_code: clean });
  if (error || !data) return { ok: false, reason: "error" } as const;
  return data as { ok: boolean; reason?: string; type?: string; event?: string; scanned_at?: string };
}

/** Cambiar de club (si gestionas varios). */
export async function switchClub(form: FormData) {
  const id = str(form, "id", 40);
  if (UUID.test(id)) (await cookies()).set("club", id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/club");
}

/** Solo administradores: verificar o quitar la verificación de un club. */
export async function verifyClub(form: FormData) {
  if (!(await isAdmin())) redirect("/club");
  const id = str(form, "id", 40);
  const verified = str(form, "verified", 5) === "true";
  if (UUID.test(id)) await supabaseAdmin().from("clubs").update({ verified }).eq("id", id);
  revalidatePath("/club/admin");
  redirect("/club/admin");
}

/** Cerrar sesión (POST: los enlaces no pueden cerrarla al precargarse). */
export async function signOutClub() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  (await cookies()).delete("club");
  redirect("/club");
}
