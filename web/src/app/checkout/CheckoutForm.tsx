"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { money, serviceFee } from "@/lib/format";
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

type Method = "razorpay" | "card" | "upi";

export default function CheckoutForm({ eventId, items, subtotal, prOff, feeRate, symbol, defaultEmail, defaultPromo = "", defaultPromoOk = false, note, methods = [] }: {
  eventId: string; items: { id: string; qty: number }[];
  /** Precio de las entradas, el descuento total si hay código de PR válido, % de cargo y símbolo de moneda. */
  subtotal: number; prOff: number; feeRate: number; symbol: string;
  defaultEmail: string; defaultPromo?: string; defaultPromoOk?: boolean; note?: string; methods?: Method[];
}) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState(defaultPromo);
  const [promoOk, setPromoOk] = useState(defaultPromoOk);
  const [promoBad, setPromoBad] = useState(false);

  // Comprueba el código de PR mientras se escribe para aplicar el descuento al momento.
  useEffect(() => {
    if (promo.length < 3) return;
    let live = true;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/pr/${encodeURIComponent(promo)}`).then((x) => x.json());
        if (live) { setPromoOk(Boolean(r.ok)); setPromoBad(!r.ok); }
      } catch { /* sin red: se valida al pagar */ }
    }, 350);
    return () => { live = false; clearTimeout(id); };
  }, [promo]);

  const off = promoOk ? prOff : 0;
  const fee = serviceFee(subtotal - off, feeRate);
  const totalLabel = money(subtotal - off + fee, symbol);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (name.trim().length < 2) return setErr(t.errName);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t.errEmailTicket);
    if (phone.replace(/\D/g, "").length < 8) return setErr(t.errPhone);
    const method = ((ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.dataset.m as Method | undefined;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items, buyer: { name: name.trim(), email: email.trim(), phone: phone.trim() }, promoCode: promo.trim() || undefined, method }),
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
      if (data.mode === "redirect") {
        saveOrderRef({ id: data.orderId, key: data.accessKey });
        window.location.href = data.url;
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
      <div className="field"><label htmlFor="pr">{t.pr.checkoutLabel}</label><input id="pr" autoComplete="off" autoCapitalize="characters" maxLength={16} placeholder={t.pr.checkoutPh} value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setPromoOk(false); setPromoBad(false); }} style={{ letterSpacing: 1, fontWeight: 600 }} />
        {promoOk && <span className="fine" style={{ color: "var(--gold-2)" }}>✓ {t.pr.applied}</span>}
        {promoBad && promo.length >= 3 && <span className="fine" style={{ color: "#ff9b9b" }}>{t.pr.eCheckout}</span>}
      </div>
      <div className="sumbox">
        {off > 0 && <div className="sum"><span>{t.pr.discount(promo)}</span><span>−{money(off, symbol)}</span></div>}
        {fee > 0 && <div className="sum"><span>{t.serviceFee}</span><span>{money(fee, symbol)}</span></div>}
        <div className="sum total"><span>{t.total}</span><span>{totalLabel}</span></div>
      </div>
      {methods.includes("card") ? (
        <>
          <button className="cta block gold paybtn" data-m="card" disabled={busy}>
            {busy ? t.processing : t.payCard(totalLabel)}
            {!busy && <small>{t.cardSub}</small>}
          </button>
          {methods.includes("upi") && (
            <>
              <p className="fine" style={{ margin: "14px 0 8px", textAlign: "center" }}>{t.upiAlt}</p>
              <button className="cta block ghost" data-m="upi" disabled={busy}>{t.payUpi}</button>
            </>
          )}
        </>
      ) : (
        <button className="cta block gold" data-m={methods[0]} disabled={busy}>{busy ? t.processing : t.payX(totalLabel)}</button>
      )}
      {err && <p className="error" role="alert">{err}</p>}
      <p className="fine" style={{ marginTop: 12, textAlign: "center" }}>{note ?? t.payNote}</p>
    </form>
  );
}
