"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LangProvider";

/** Formulario para la referencia del pago UPI (UTR). */
export default function UpiForm({ orderId, accessKey }: { orderId: string; accessKey: string }) {
  const u = useT().upi;
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    const clean = utr.replace(/\D/g, "");
    if (clean.length !== 12) return setErr(u.badUtr);
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/upi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ k: accessKey, utr: clean }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      return setErr(d?.error === "used" ? u.usedUtr : d?.error === "bad" ? u.badUtr : u.failed);
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="utr">{u.utrLabel}</label>
        <input id="utr" inputMode="numeric" autoComplete="off" maxLength={16} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="412345678901" style={{ letterSpacing: 2 }} />
        <span className="fine">{u.utrHelp}</span>
      </div>
      <button className="cta block gold" disabled={busy}>{busy ? u.sending : u.send}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </form>
  );
}

/** UPI ID con botón de copiar. */
export function Vpa({ vpa, name }: { vpa: string; name: string }) {
  const u = useT().upi;
  const [done, setDone] = useState(false);
  return (
    <div className="vpa">
      <span><b>{vpa}</b><span className="fine">{name}</span></span>
      <button type="button" className="pill" onClick={() => { navigator.clipboard?.writeText(vpa).then(() => setDone(true)).catch(() => {}); }}>{done ? u.copied : u.copy}</button>
    </div>
  );
}

