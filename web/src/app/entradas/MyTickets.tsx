"use client";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { getLocalOrders, getOrderRefs, type LocalOrder, type OrderRef } from "@/lib/local-orders";

export default function MyTickets() {
  const [refs, setRefs] = useState<OrderRef[] | null>(null);
  const [local, setLocal] = useState<LocalOrder[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const l = getLocalOrders();
    setRefs(getOrderRefs());
    setLocal(l);
    Promise.all(l.flatMap((o) => o.codes).map(async (c) => [c, await QRCode.toDataURL(c, { margin: 1, width: 400, color: { dark: "#19050b", light: "#f5ebda" } })] as const))
      .then((pairs) => setQrs(Object.fromEntries(pairs)));
  }, []);

  if (refs === null) return null;
  if (!refs.length && !local.length) {
    return (
      <div className="list">
        <div className="empty"><b>Aún no tienes entradas</b>Cuando compres, tu QR aparece aquí.
          <div style={{ marginTop: 16 }}><Link href="/" className="cta">Ver eventos</Link></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {refs.length > 0 && (
        <div className="list">
          {refs.map((r, i) => (
            <Link key={r.id} href={`/t/${r.id}?k=${r.key}`} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Pedido {i + 1}</span><span className="scarce">Ver QR →</span>
            </Link>
          ))}
        </div>
      )}
      {local.map((o) => (
        <div key={o.id}>
          <p className="fine section">Compra de prueba (modo demo)</p>
          {o.codes.map((c, i) => (
            <div className="ticket" key={c}>
              <div className="tb">
                <h2>{o.event.title}</h2>
                <div className="tgrid">
                  <div><span>Cuándo</span><b>{o.event.starts}</b></div>
                  <div><span>Lugar</span><b>{o.event.venue}</b></div>
                  <div><span>Entradas</span><b>{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</b></div>
                  <div><span>QR</span><b>{i + 1}/{o.codes.length}</b></div>
                </div>
              </div>
              <div className="perf" />
              <div className="qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qrs[c] && <img src={qrs[c]} alt={`Código QR ${c}`} />}
                <code>{c}</code>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
