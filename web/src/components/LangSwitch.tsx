"use client";
import { useRouter } from "next/navigation";
import { useLang, useT } from "./LangProvider";

/** Cambia entre inglés y español y lo recuerda. */
export default function LangSwitch({ className = "langsw" }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const next = lang === "en" ? "es" : "en";
  return (
    <button
      type="button"
      className={className}
      lang={next}
      aria-label={`${t.langLabel}: ${t.langSwitch}`}
      onClick={() => {
        document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        router.refresh();
      }}
    >
      {next.toUpperCase()}
    </button>
  );
}
