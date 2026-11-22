"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Entrar con el email: te llega un código y lo escribes. Sin contraseñas. */
export default function LoginForm({ next, cta = "Recibir código" }: { next: string; cta?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Escribe un email válido.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
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
      <form onSubmit={verify}>
        <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Te mandamos un código a <b style={{ color: "var(--cream)" }}>{email}</b>. Mira también en spam.</p>
        <div className="field">
          <label htmlFor="code">Código</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
        </div>
        <button className="cta block" disabled={busy}>{busy ? "Comprobando…" : "Entrar"}</button>
        {err && <p className="error">{err}</p>}
        <button type="button" className="fine" style={{ marginTop: 14 }} onClick={() => { setStep("email"); setCode(""); setErr(""); }}>← Usar otro email</button>
      </form>
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
