"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Entrar con el email: te llega un enlace (o un código). Sin contraseñas. */
export default function LoginForm({ next, cta = "Entrar con email" }: { next: string; cta?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Escribe un email válido.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) {
      setErr(/rate|seconds/i.test(error.message) ? "Espera un momento antes de pedir otro código." : "No se pudo enviar el código. Inténtalo otra vez.");
      return;
    }
    setStep("code");
  }

  async function verify(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setErr("Escribe el código que te llegó por email.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (error) return setErr("Código incorrecto o caducado.");
    router.replace(next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <div>
        <div className="card" style={{ textAlign: "center" }}>
          <b style={{ fontSize: 18 }}>Revisa tu email</b>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>Te mandamos un enlace a <b style={{ color: "var(--cream)" }}>{email}</b>. Púlsalo y entras. Mira también en spam.</p>
        </div>
        {showCode ? (
          <form onSubmit={verify} style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="code">Código del email</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
            </div>
            <button className="cta block" disabled={busy}>{busy ? "Comprobando…" : "Entrar"}</button>
          </form>
        ) : (
          <button type="button" className="fine" style={{ marginTop: 14, textDecoration: "underline" }} onClick={() => setShowCode(true)}>¿Te llegó un código? Escríbelo aquí</button>
        )}
        {err && <p className="error">{err}</p>}
        <button type="button" className="fine" style={{ marginTop: 14, display: "block" }} onClick={() => { setStep("email"); setCode(""); setErr(""); setShowCode(false); }}>← Usar otro email</button>
      </div>
    );
  }

  return (
    <form onSubmit={send}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
      </div>
      <button className="cta block" disabled={busy}>{busy ? "Enviando…" : cta}</button>
      {err && <p className="error">{err}</p>}
    </form>
  );
}
