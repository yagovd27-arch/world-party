"use client";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { scanTicket } from "../actions";

type Result = { ok: boolean; title: string; sub: string };

const REASON: Record<string, string> = {
  not_found: "Este código no existe",
  forbidden: "La entrada es de otro club",
  used: "Ya se usó",
  login: "Vuelve a iniciar sesión",
  error: "Error de conexión, prueba otra vez",
};

export default function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const last = useRef({ code: "", at: 0 });
  const [on, setOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(0);

  async function check(code: string) {
    busy.current = true;
    const r = await scanTicket(code);
    if (r.ok) {
      setCount((c) => c + 1);
      setResult({ ok: true, title: "✓ Adelante", sub: `${r.type ?? ""} · ${r.event ?? ""}` });
      navigator.vibrate?.(120);
    } else {
      const when = r.reason === "used" && r.scanned_at ? ` a las ${new Date(r.scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
      setResult({ ok: false, title: "✕ No vale", sub: (REASON[r.reason ?? "error"] ?? "No válida") + when });
      navigator.vibrate?.([80, 60, 80]);
    }
    setTimeout(() => { busy.current = false; }, 1800);
  }

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let lastTick = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const tick = (t: number) => {
          raf = requestAnimationFrame(tick);
          if (t - lastTick < 150 || busy.current || v.readyState < 2) return;
          lastTick = t;
          const c = canvas.current!;
          const w = 480;
          const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
          c.width = w; c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(v, 0, 0, w, h);
          const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (!found?.data) return;
          const code = found.data.trim();
          if (code === last.current.code && Date.now() - last.current.at < 4000) return;
          last.current = { code, at: Date.now() };
          check(code);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCamErr("No se pudo abrir la cámara. Da permiso a la cámara en el navegador o escribe el código a mano.");
        setOn(false);
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [on]);

  return (
    <div>
      <div className="scanbox">
        <video ref={video} playsInline muted style={{ display: on ? "block" : "none" }} />
        {!on && <button className="cta" onClick={() => { setCamErr(""); setOn(true); }}>Abrir cámara</button>}
        {on && <span className="scanframe" aria-hidden="true" />}
      </div>
      <canvas ref={canvas} hidden />
      {camErr && <p className="error">{camErr}</p>}
      {result && (
        <div className={`scan-result ${result.ok ? "ok" : "bad"}`} role="status">
          {result.title}
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{result.sub}</div>
        </div>
      )}
      <form
        style={{ display: "flex", gap: 8, marginTop: 16 }}
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { check(manual); setManual(""); } }}
      >
        <input className="pill" style={{ flex: 1, fontSize: 16, padding: "12px 14px" }} value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="Código a mano (ej. 7F3A9C21BD)" maxLength={20} autoCapitalize="characters" />
        <button className="cta" style={{ padding: "12px 18px" }}>Validar</button>
      </form>
      <p className="fine" style={{ marginTop: 12 }}>Validadas en esta sesión: {count}</p>
    </div>
  );
}
