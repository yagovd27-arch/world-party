"use client";
import { useFormStatus } from "react-dom";

/** Botón de formulario que muestra "…" mientras se envía. */
export default function SubmitButton({ children, pendingText = "Guardando…", className = "cta block" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? pendingText : children}</button>;
}
