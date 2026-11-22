"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Página a la que lleva el enlace del email: guarda la sesión y te devuelve donde estabas. */
export default function Callback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [failed, setFailed] = useState(false);
  const raw = sp.get("next") ?? "/perfil";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/perfil";

  useEffect(() => {
    const sb = supabaseBrowser();
    let done = false;
    const go = () => { if (!done) { done = true; router.replace(next); router.refresh(); } };
    const { data } = sb.auth.onAuthStateChange((_e, session) => { if (session) go(); });
    sb.auth.getSession().then(({ data: d }) => { if (d.session) go(); });
    const t = setTimeout(() => { if (!done) setFailed(true); }, 6000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [next, router]);

  return failed ? (
    <div className="section" style={{ textAlign: "center" }}>
      <b style={{ fontSize: 18 }}>El enlace ha caducado</b>
      <p className="muted" style={{ marginTop: 6 }}>Pide uno nuevo.</p>
      <Link className="cta" style={{ marginTop: 16 }} href={next}>Volver</Link>
    </div>
  ) : (
    <p className="muted">Entrando…</p>
  );
}
