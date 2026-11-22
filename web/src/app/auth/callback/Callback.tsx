"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

/** Página a la que lleva el enlace del email: guarda la sesión y te devuelve donde estabas. */
export default function Callback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [failed, setFailed] = useState("");
  const all = useT();
  const t = all.login;
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
        return error ? setFailed(t.cbSession) : go();
      }
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        return error ? setFailed(t.cbBrowser) : go();
      }
      const desc = hash.get("error_description") ?? sp.get("error_description");
      if (desc) return setFailed(/expired|invalid/i.test(desc) ? t.cbExpired : desc);
      const { data } = await sb.auth.getSession();
      return data.session ? go() : setFailed(t.cbInvalid);
    })();
  }, [next, router, sp, t]);

  return failed ? (
    <div className="section" style={{ textAlign: "center" }}>
      <b style={{ fontSize: 18 }}>{t.failed}</b>
      <p className="muted" style={{ marginTop: 6 }}>{failed}</p>
      <Link className="cta" style={{ marginTop: 16 }} href={next}>{all.back}</Link>
    </div>
  ) : (
    <p className="muted">{t.entering}</p>
  );
}
