import "server-only";
import { sendTicketEmail } from "./email";
import type { Lang } from "./i18n";
import { supabaseAdmin } from "./supabase/server";

/**
 * Marca un pedido como pagado (emite las entradas) y manda el email con los QR.
 * Si ya estaba pagado no hace nada. Devuelve el error de la base de datos si se agotó.
 */
export async function confirmOrder(orderId: string, providerPayment: string, lang: Lang = "en") {
  const sb = supabaseAdmin();
  const { data: before } = await sb.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!before) return { ok: false, error: "not_found" } as const;
  if (before.status === "paid") return { ok: true, already: true } as const;
  const { error } = await sb.rpc("confirm_order", { oid: orderId, provider_payment: providerPayment });
  if (error) return { ok: false, error: error.message.includes("sold_out") ? "sold_out" : error.message } as const;
  try {
    await sendTicketEmail(orderId, lang);
  } catch (e) {
    console.error("[confirmOrder] email", e);
  }
  return { ok: true, already: false } as const;
}
