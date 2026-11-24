"use client";
import { useState } from "react";

/** Link con botón de copiar (o compartir en el móvil). */
export default function CopyLink({ url, label, copied }: { url: string; label: string; copied: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    } catch {
      window.prompt("", url);
    }
  }
  return (
    <div className="copylink">
      <code>{url.replace(/^https?:\/\//, "")}</code>
      <button type="button" className="pill" onClick={copy}>{ok ? copied : label}</button>
    </div>
  );
}
