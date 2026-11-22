"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Página a la que lleva el enlace del email: guarda la sesión y te devuelve donde estabas. */
export default function Callback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [failed, setFailed] = useState("");
  const raw = sp.get("next") ?? "/perfil";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/perfil";

  useEffect(() => {
    const sb = supabaseBrowser();
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = sp.get("code");
    const go = () => { router.replace(next); router.refresh(); };
    (async () => {
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await sb.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! });
        return error ? setFailed("No se pudo iniciar sesión. Pide un enlace nuevo.") : go();
      }
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        return error ? setFailed("Abre el enlace en el mismo navegador donde lo pediste, o pide uno nuevo.") : go();
      }
      const desc = hash.get("error_description") ?? sp.get("error_description");
      if (desc) return setFailed(/expired|invalid/i.test(desc) ? "El enlace ha caducado o ya se usó. Pide uno nuevo." : desc);
      const { data } = await sb.auth.getSession();
      return data.session ? go() : setFailed("Enlace no válido. Pide uno nuevo.");
    })();
  }, [next, router, sp]);

  return failed ? (
    <div className="section" style={{ textAlign: "center" }}>
      <b style={{ fontSize: 18 }}>No se pudo entrar</b>
      <p className="muted" style={{ marginTop: 6 }}>{failed}</p>
      <Link className="cta" style={{ marginTop: 16 }} href={next}>Volver</Link>
    </div>
  ) : (
    <p className="muted">Entrando…</p>
  );
}
