"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";
import type { TicketType } from "@/lib/types";

export default function TicketPicker({ eventId, symbol, tiers }: { eventId: string; symbol: string; tiers: TicketType[] }) {
  const router = useRouter();
  const [q, setQ] = useState<Record<string, number>>({});
  const count = Object.values(q).reduce((a, b) => a + b, 0);
  const total = tiers.reduce((s, t) => s + (q[t.id] ?? 0) * t.price, 0);
  const change = (t: TicketType, d: number) => {
    const left = t.capacity - t.sold;
    setQ((prev) => ({ ...prev, [t.id]: Math.max(0, Math.min(Math.min(10, left), (prev[t.id] ?? 0) + d)) }));
  };
  const buy = () => {
    const items = Object.entries(q).filter(([, n]) => n > 0).map(([id, n]) => `${id}:${n}`).join(",");
    router.push(`/checkout?e=${encodeURIComponent(eventId)}&q=${encodeURIComponent(items)}`);
  };

  return (
    <>
      <div className="tiers">
        {tiers.map((t) => {
          const left = t.capacity - t.sold;
          const out = left <= 0;
          const n = q[t.id] ?? 0;
          return (
            <div key={t.id} className={`tier ${out ? "out" : ""} ${n ? "sel" : ""}`}>
              <div>
                <div className="nm">{t.name}</div>
                <div className="pr">{money(t.price, symbol)}</div>
                <div className="nt">{out ? "Agotado" : [t.description, left <= 20 ? `Quedan ${left}` : ""].filter(Boolean).join(". ")}</div>
              </div>
              {out ? null : (
                <div className="step">
                  <button type="button" onClick={() => change(t, -1)} disabled={!n} aria-label={`Quitar ${t.name}`}>−</button>
                  <b aria-live="polite">{n}</b>
                  <button type="button" className="plus" onClick={() => change(t, 1)} disabled={n >= Math.min(10, left)} aria-label={`Añadir ${t.name}`}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="buybar">
        <div className="tot">
          <span>{count ? `${count} entrada${count > 1 ? "s" : ""}` : "Elige tus entradas"}</span>
          <b>{money(total, symbol)}</b>
        </div>
        <button type="button" className="cta" disabled={!count} onClick={buy}>Continuar</button>
      </div>
    </>
  );
}
