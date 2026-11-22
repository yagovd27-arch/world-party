"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveLocalOrder, saveOrderRef } from "@/lib/local-orders";

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

export default function CheckoutForm({ eventId, items, totalLabel }: { eventId: string; items: { id: string; qty: number }[]; totalLabel: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    if (name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Escribe un email válido: ahí te llega la entrada.");
    if (phone.replace(/\D/g, "").length < 8) return setErr("Escribe un teléfono válido.");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items, buyer: { name: name.trim(), email: email.trim(), phone: phone.trim() } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el pedido.");

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
      if (data.mode === "razorpay") {
        if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("No se pudo abrir la pasarela de pago.");
        const rp = new window.Razorpay({
          key: data.keyId,
          order_id: data.providerOrderId,
          amount: data.amount,
          currency: data.currency,
          name: "denoche",
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
            if (!v.ok) { setErr(vd.error ?? "No se pudo confirmar el pago."); setBusy(false); return; }
            saveOrderRef({ id: data.orderId, key: data.accessKey });
            router.push(`/t/${data.orderId}?k=${data.accessKey}&nuevo=1`);
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rp.on("payment.failed", () => { setErr("El pago no se completó. Prueba otra vez u otro método."); setBusy(false); });
        rp.open();
        return;
      }
      throw new Error("Respuesta inesperada.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Algo falló.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ marginTop: 18 }}>
      <div className="field"><label htmlFor="n">Nombre completo</label><input id="n" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="ph">Teléfono (WhatsApp)</label><input id="ph" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <button className="cta block gold" disabled={busy}>{busy ? "Procesando…" : `Pagar ${totalLabel}`}</button>
      {err && <p className="error" role="alert">{err}</p>}
      <p className="fine" style={{ marginTop: 12, textAlign: "center" }}>Pago seguro con UPI o tarjeta. Recibirás tu entrada con QR al instante.</p>
    </form>
  );
}
