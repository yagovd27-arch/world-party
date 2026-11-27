import "server-only";
import QRCode from "qrcode";
import { parts, shortDate, tzFor } from "./format";
import { dict, type Lang } from "./i18n";
import { supabaseAdmin } from "./supabase/server";

const SITE = "https://www.lanit.club";
const FROM = process.env.EMAIL_FROM ?? "la nit <hola@lanit.club>";
export const emailOn = Boolean(process.env.RESEND_API_KEY);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = {
  id: string; access_key: string; buyer_name: string; buyer_email: string; total: number; currency: string;
  event: { title: string; starts_at: string; city_id: string; club: { name: string; area: string | null; address: string | null } };
  tickets: { code: string; ticket_type: { name: string } }[];
};

/** Envía las entradas con su QR al email del comprador. Si no hay clave de Resend, no hace nada. */
export async function sendTicketEmail(orderId: string, lang: Lang = "en") {
  if (!emailOn) return { ok: false, skipped: true } as const;
  const t = dict(lang);
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("id, access_key, buyer_name, buyer_email, total, currency, event:events(title, starts_at, city_id, club:clubs(name, area, address)), tickets(code, ticket_type:ticket_types(name))")
    .eq("id", orderId)
    .eq("status", "paid")
    .maybeSingle();
  if (!data) return { ok: false } as const;
  const o = data as unknown as Row;
  const tz = tzFor(o.event.city_id);
  const when = `${shortDate(o.event.starts_at, tz, lang)}, ${t.hour(parts(o.event.starts_at, tz).time)}`;
  const where = [o.event.club.name, o.event.club.address || o.event.club.area].filter(Boolean).join(", ");
  const link = `${SITE}/t/${o.id}?k=${o.access_key}`;

  const pngs = await Promise.all(
    o.tickets.map((tk) => QRCode.toBuffer(tk.code, { margin: 1, width: 480, color: { dark: "#19050b", light: "#ffffff" } })),
  );
  const attachments = o.tickets.map((tk, i) => ({
    filename: `${tk.code}.png`,
    content: pngs[i].toString("base64"),
    content_id: `qr-${tk.code}`,
  }));

  const ticketsHtml = o.tickets
    .map((tk, i) => `
      <tr><td style="padding:18px 0;border-top:1px solid #eadfcd;text-align:center">
        <img src="cid:qr-${tk.code}" width="220" height="220" alt="QR ${tk.code}" style="display:block;margin:0 auto 8px">
        <div style="font:700 15px/1.3 Helvetica,Arial,sans-serif;letter-spacing:2px;color:#19050b">${tk.code}</div>
        <div style="font:13px/1.4 Helvetica,Arial,sans-serif;color:#6b5a4c">${esc(tk.ticket_type.name)}, ${i + 1}/${o.tickets.length}</div>
      </td></tr>`)
    .join("");

  const m = t.mail;
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f5ebda">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5ebda"><tr><td align="center" style="padding:28px 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px">
      <tr><td style="background:#1f060e;border-radius:12px 12px 0 0;padding:20px 24px;font:800 24px/1 Helvetica,Arial,sans-serif;letter-spacing:-1px;color:#f2e4cc">la nit<span style="color:#c9a46c">.</span></td></tr>
      <tr><td style="padding:24px">
        <div style="font:14px/1.5 Helvetica,Arial,sans-serif;color:#6b5a4c">${esc(m.hi(o.buyer_name.split(" ")[0]))}</div>
        <h1 style="margin:6px 0 4px;font:800 24px/1.2 Helvetica,Arial,sans-serif;color:#19050b">${esc(o.event.title)}</h1>
        <div style="font:15px/1.5 Helvetica,Arial,sans-serif;color:#19050b">${esc(when)}<br>${esc(where)}</div>
        <p style="font:14px/1.5 Helvetica,Arial,sans-serif;color:#6b5a4c;margin:14px 0 0">${esc(m.showAtDoor)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${ticketsHtml}</table>
        <p style="text-align:center;margin:18px 0 6px"><a href="${link}" style="display:inline-block;background:#1f060e;color:#f2e4cc;text-decoration:none;font:700 15px Helvetica,Arial,sans-serif;padding:13px 22px;border-radius:6px">${esc(m.open)}</a></p>
        <p style="font:12px/1.5 Helvetica,Arial,sans-serif;color:#8a7a6c;margin:16px 0 0">${esc(m.footer)}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const text = [m.hi(o.buyer_name.split(" ")[0]), o.event.title, when, where, "", m.showAtDoor, ...o.tickets.map((tk) => `${tk.ticket_type.name}: ${tk.code}`), "", link].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [o.buyer_email], subject: m.subject(o.event.title), html, text, attachments }),
  });
  if (!res.ok) {
    console.error("[sendTicketEmail]", res.status, await res.text());
    return { ok: false } as const;
  }
  return { ok: true } as const;
}
