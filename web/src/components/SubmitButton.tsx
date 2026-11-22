"use client";
import { useFormStatus } from "react-dom";
import { useT } from "./LangProvider";

/** Botón de formulario que muestra "…" mientras se envía. */
export default function SubmitButton({ children, pendingText, className = "cta block" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  const t = useT();
  return <button className={className} disabled={pending}>{pending ? pendingText ?? t.club.saving : children}</button>;
}
