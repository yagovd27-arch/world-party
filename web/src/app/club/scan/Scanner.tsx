"use client";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { scanTicket } from "../actions";
import { useT } from "@/components/LangProvider";

type Result = { ok: boolean; title: string; sub: string };

export default function Scanner() {
  const c = useT().club;
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
      setResult({ ok: true, title: c.go, sub: [r.type, r.event].filter(Boolean).join(", ") });
      navigator.vibrate?.(120);
    } else {
      const when = r.reason === "used" && r.scanned_at ? c.usedAt(new Date(r.scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : "";
      setResult({ ok: false, title: c.noGo, sub: (c.reason[r.reason ?? "error"] ?? c.invalid) + when });
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
        setCamErr(c.camErr);
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
        {!on && <button className="cta" onClick={() => { setCamErr(""); setOn(true); }}>{c.openCam}</button>}
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
        <input className="pill" style={{ flex: 1, fontSize: 16, padding: "12px 14px" }} value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder={c.manualPh} maxLength={20} autoCapitalize="characters" />
        <button className="cta" style={{ padding: "12px 18px" }}>{c.validate}</button>
      </form>
      <p className="fine" style={{ marginTop: 12 }}>{c.validated(count)}</p>
    </div>
  );
}
