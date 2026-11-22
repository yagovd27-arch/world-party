"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser, supabaseMailer } from "@/lib/supabase/client";
import { useT } from "./LangProvider";

/** Entrar con el email: te llega un código (y un enlace). Sin contraseñas. */
export default function LoginForm({ next, cta }: { next: string; cta?: string }) {
  const router = useRouter();
  const t = useT().login;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr(t.badEmail);
    setBusy(true);
    const { error } = await supabaseMailer().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) {
      setErr(/rate|seconds/i.test(error.message) ? t.wait : t.sendFailed);
      return;
    }
    setStep("code");
  }

  async function verify(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setErr(t.noCode);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (error) return setErr(t.badCode);
    router.replace(next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verify}>
        <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
          {t.sentTo} <b style={{ color: "var(--cream)" }}>{email}</b>{t.sentToRest}
        </p>
        <div className="field">
          <label htmlFor="code">{t.code}</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus style={{ fontSize: 22, letterSpacing: 4 }} />
        </div>
        <button className="cta block" disabled={busy}>{busy ? t.checking : t.enter}</button>
        {err && <p className="error">{err}</p>}
        <button type="button" className="fine" style={{ marginTop: 14, display: "block" }} onClick={() => { setStep("email"); setCode(""); setErr(""); }}>{t.other}</button>
      </form>
    );
  }

  return (
    <form onSubmit={send}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.placeholder} />
      </div>
      <button className="cta block" disabled={busy}>{busy ? t.sending : cta ?? t.cta}</button>
      {err && <p className="error">{err}</p>}
    </form>
  );
}
