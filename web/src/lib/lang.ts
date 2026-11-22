import "server-only";
import { cookies, headers } from "next/headers";
import { dict, isLang, langFromHeader, type Lang } from "./i18n";

/** Idioma de la visita: el que eligió (cookie) o el de su navegador. */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get("lang")?.value;
  if (isLang(saved)) return saved;
  return langFromHeader((await headers()).get("accept-language"));
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: dict(lang) };
}
