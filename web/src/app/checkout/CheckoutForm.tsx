"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveLocalOrder, saveOrderRef } from "@/lib/local-orders";
import { useT } from "@/components/LangProvider";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutForm({ eventId, items, totalLabel, defaultEmail, defaultPromo = "", note }: { eventId: string; items: { id: string; qty: number }[]; totalLabel: string; defaultEmail: string; defaultPromo?: string; note?: string }) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState(defaultPromo);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (name.trim().length < 2) return setErr(t.errName);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t.errEmailTicket);
    if (phone.replace(/\D/g, "").length < 8) return setErr(t.errPhone);
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items, buyer: { name: name.trim(), email: email.trim(), phone: phone.trim() }, promoCode: promo.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errOrder);

      if (data.mode === "local") {
        saveLocalOrder(data.order);
        router.push(`/entradas?nuevo=${data.order.id}`);
        return;
      }
      if (data.mode === "paid") {
        saveOrderRef({ id: data.orderId, key: data.accessKey });
        router.push(`/t/${data.orderId}?k=${data.accessKey}&nuevo=1`);
        return;
      }
      if (data.mode === "upi") {
        saveOrderRef({ id: data.orderId, key: data.accessKey });
        router.push(`/pagar/${data.orderId}?k=${data.accessKey}`);
        return;
      }
      if (data.mode === "razorpay") {
        if (!(await loadRazorpay()) || !window.Razorpay) throw new Error(t.errGateway);
        const rp = new window.Razorpay({
          key: data.keyId,
          order_id: data.providerOrderId,
          amount: data.amount,
          currency: data.currency,
          name: "la nit",
          description: data.description,
          prefill: { name, email, contact: phone },
          theme: { color: "#230810" },
          handler: async (r: RazorpayResponse) => {
            const v = await fetch(`/api/orders/${data.orderId}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(r),
            });
            const vd = await v.json();
            if (!v.ok) { setErr(vd.error ?? t.errConfirm); setBusy(false); return; }
            saveOrderRef({ id: data.orderId, key: data.accessKey });
            router.push(`/t/${data.orderId}?k=${data.accessKey}&nuevo=1`);
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rp.on("payment.failed", () => { setErr(t.errPayFailed); setBusy(false); });
        rp.open();
        return;
      }
      throw new Error(t.errUnexpected);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errGeneric);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ marginTop: 18 }}>
      <div className="field"><label htmlFor="n">{t.fullName}</label><input id="n" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="em">{t.email}</label><input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="ph">{t.phoneWa}</label><input id="ph" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="field"><label htmlFor="pr">{t.pr.checkoutLabel}</label><input id="pr" autoComplete="off" autoCapitalize="characters" maxLength={16} placeholder={t.pr.checkoutPh} value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} style={{ letterSpacing: 1, fontWeight: 600 }} /></div>
      <button className="cta block gold" disabled={busy}>{busy ? t.processing : t.payX(totalLabel)}</button>
      {err && <p className="error" role="alert">{err}</p>}
      <p className="fine" style={{ marginTop: 12, textAlign: "center" }}>{note ?? t.payNote}</p>
    </form>
  );
}
