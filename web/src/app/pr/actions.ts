"use server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { CODE_RE, getMyPromoter, normalizeCode } from "@/lib/promoters";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Crea el perfil de PR del usuario con su código. */
export async function createPromoter(form: FormData) {
  const p = (await getT()).t.pr;
  const user = await getUser();
  if (!user?.email) redirect("/pr");
  if (await getMyPromoter(user.id, user.email)) redirect("/pr");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const code = normalizeCode(String(form.get("code") ?? ""));
  const back = (e: string) => redirect(`/pr?e=${encodeURIComponent(e)}&name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`);
  if (name.length < 2) back(p.eName);
  if (!CODE_RE.test(code)) back(p.eCode);

  const { error } = await supabaseAdmin().from("promoters").insert({ user_id: user.id, code, name, email: user.email.toLowerCase() });
  if (error) {
    if (error.code === "23505") back(p.eTaken);
    console.error("[createPromoter]", error.message);
    back(p.eCreate);
  }
  redirect("/pr");
}
