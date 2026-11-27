import { NextResponse } from "next/server";
import { getPromoterByCode } from "@/lib/promoters";

/** ¿Existe este código de PR? Lo usa el checkout para aplicar el descuento al momento. */
export async function GET(_req: Request, { params }: RouteContext<"/api/pr/[code]">) {
  const { code } = await params;
  const p = await getPromoterByCode(decodeURIComponent(code));
  return NextResponse.json({ ok: Boolean(p), code: p?.code ?? null });
}
