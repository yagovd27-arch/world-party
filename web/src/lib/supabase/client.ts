"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente del navegador: login con código y subida de fotos. */
export function supabaseBrowser() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      // "implicit": el enlace del email funciona aunque se abra en otro navegador (p. ej. desde la app de Gmail).
      auth: { flowType: "implicit", detectSessionInUrl: true },
    });
  }
  return client;
}
