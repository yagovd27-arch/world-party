"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { saveEvent, type EventInput, type TierInput } from "../actions";

type Props = {
  clubId: string;
  userId: string;
  currency: string;
  verified: boolean;
  initial?: Omit<EventInput, "clubId" | "publish"> & { status: string; sold: Record<string, number> };
};

const DEFAULT_TIERS: TierInput[] = [
  { name: "Early bird", description: "Precio especial hasta agotar cupo", price: 0, capacity: 50, salesEnd: "" },
  { name: "General", description: "", price: 0, capacity: 200, salesEnd: "" },
  { name: "VIP", description: "Acceso prioritario", price: 0, capacity: 30, salesEnd: "" },
];

/** Reduce la foto antes de subirla (máx. 1600 px, JPEG). */
async function shrink(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EventForm({ clubId, userId, currency, verified, initial }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    lineup: initial?.lineup ?? "",
    type: initial?.type ?? "club",
    startsLocal: initial?.startsLocal ?? "",
    imageUrl: initial?.imageUrl ?? "",
    minAge: initial?.minAge ?? 18,
    dressCode: initial?.dressCode ?? "",
  });
  const [tiers, setTiers] = useState<TierInput[]>(initial?.tiers?.length ? initial.tiers : DEFAULT_TIERS);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sold = initial?.sold ?? {};
  const isPublished = initial?.status === "published";

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === "minAge" ? Number(e.target.value) : e.target.value });
  const setTier = (i: number, k: keyof TierInput, v: string) =>
    setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: k === "price" || k === "capacity" ? Number(v) : v } : t)));

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) return setErr("Sube una imagen (JPG o PNG).");
    setUploading(true);
    try {
      const blob = await shrink(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const sb = supabaseBrowser();
      const { error } = await sb.storage.from("event-images").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      setF((cur) => ({ ...cur, imageUrl: sb.storage.from("event-images").getPublicUrl(path).data.publicUrl }));
    } catch {
      setErr("No se pudo subir la foto. Prueba con otra.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(publish: EventInput["publish"]) {
    setErr("");
    setBusy(true);
    const res = await saveEvent({ ...f, id: initial?.id, clubId, publish, tiers });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    router.push(`/club/eventos/${res.id}${res.note ? "?n=" + encodeURIComponent(res.note) : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(isPublished ? "keep" : "publish"); }} style={{ maxWidth: 620 }}>
      <div className="field">
        <label>Foto o flyer</label>
        <label className="upload ph" style={f.imageUrl ? { backgroundImage: `url(${f.imageUrl})` } : undefined}>
          <input type="file" accept="image/*" onChange={upload} hidden />
          <span className="pill">{uploading ? "Subiendo…" : f.imageUrl ? "Cambiar foto" : "Subir foto"}</span>
        </label>
      </div>
      <div className="field"><label htmlFor="title">Nombre del evento</label><input id="title" value={f.title} onChange={set("title")} required maxLength={90} placeholder="Techno Fridays" /></div>
      <div className="row2">
        <div className="field"><label htmlFor="starts">Fecha y hora</label><input id="starts" type="datetime-local" value={f.startsLocal} onChange={set("startsLocal")} required /></div>
        <div className="field">
          <label htmlFor="type">Tipo</label>
          <select id="type" value={f.type} onChange={set("type")}>
            <option value="club">Club</option>
            <option value="fiesta">Fiesta</option>
            <option value="concierto">Concierto</option>
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="lineup">Line-up (separado por comas)</label><input id="lineup" value={f.lineup} onChange={set("lineup")} maxLength={300} placeholder="DJ Uno, DJ Dos" /></div>
      <div className="field"><label htmlFor="desc">Descripción</label><textarea id="desc" value={f.description} onChange={set("description")} maxLength={2000} placeholder="Qué va a pasar, música, horario de puertas…" /></div>
      <div className="row2">
        <div className="field"><label htmlFor="age">Edad mínima</label><input id="age" type="number" min={0} max={99} value={f.minAge} onChange={set("minAge")} /></div>
        <div className="field"><label htmlFor="dress">Dress code</label><input id="dress" value={f.dressCode} onChange={set("dressCode")} maxLength={80} placeholder="Smart casual" /></div>
      </div>

      <h2 className="h2" style={{ marginTop: 10 }}>Entradas</h2>
      <p className="fine" style={{ marginTop: -6, marginBottom: 12 }}>Precio en {currency}. El comprador paga además un cargo de servicio; el club recibe el precio entero.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {tiers.map((t, i) => (
          <div className="card" key={t.id ?? i} style={{ padding: 14 }}>
            <div className="row2">
              <div className="field"><label>Nombre</label><input value={t.name} onChange={(e) => setTier(i, "name", e.target.value)} maxLength={40} /></div>
              <div className="field"><label>Precio ({currency})</label><input type="number" min={0} inputMode="numeric" value={t.price} onChange={(e) => setTier(i, "price", e.target.value)} /></div>
            </div>
            <div className="row2">
              <div className="field"><label>Cupo{t.id && sold[t.id] ? ` (vendidas ${sold[t.id]})` : ""}</label><input type="number" min={1} inputMode="numeric" value={t.capacity} onChange={(e) => setTier(i, "capacity", e.target.value)} /></div>
              <div className="field"><label>Venta hasta (opcional)</label><input type="datetime-local" value={t.salesEnd} onChange={(e) => setTier(i, "salesEnd", e.target.value)} /></div>
            </div>
            <div className="field" style={{ marginBottom: 6 }}><label>Nota (opcional)</label><input value={t.description} onChange={(e) => setTier(i, "description", e.target.value)} maxLength={120} placeholder="Incluye una copa" /></div>
            {!(t.id && sold[t.id]) && tiers.length > 1 && (
              <button type="button" className="fine" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>Quitar esta entrada</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="pill" style={{ marginTop: 10 }} onClick={() => setTiers([...tiers, { name: "", description: "", price: 0, capacity: 50, salesEnd: "" }])}>+ Añadir tipo de entrada</button>

      <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
        {isPublished ? (
          <button className="cta block" disabled={busy || uploading}>{busy ? "Guardando…" : "Guardar cambios"}</button>
        ) : (
          <>
            <button className="cta block" disabled={busy || uploading}>{busy ? "Guardando…" : verified ? "Publicar" : "Guardar (se publica al verificar tu club)"}</button>
            {verified && <button type="button" className="cta ghost block" disabled={busy || uploading} onClick={() => submit("draft")}>Guardar como borrador</button>}
          </>
        )}
      </div>
      {err && <p className="error">{err}</p>}
    </form>
  );
}
