import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseOn = Boolean(SUPABASE_URL && SUPABASE_ANON);

/** Cliente con la sesión del usuario (clubs, admin). Respeta las reglas de seguridad. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy refresca la sesión.
        }
      },
    },
  });
}

/** Cliente con la clave de servicio: solo en el servidor, para pedidos y entradas. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
