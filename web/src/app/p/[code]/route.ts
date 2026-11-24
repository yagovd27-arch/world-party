import { NextResponse } from "next/server";
import { CODE_RE, normalizeCode } from "@/lib/promoters";

/** lanit.club/p/CODIGO → guarda el código del PR 30 días y lleva a la web (o al evento con ?e=). */
export async function GET(req: Request, ctx: RouteContext<"/p/[code]">) {
  const { code } = await ctx.params;
  const c = normalizeCode(decodeURIComponent(code));
  const e = new URL(req.url).searchParams.get("e") ?? "";
  const to = new URL(/^[0-9a-f-]{36}$/i.test(e) ? `/e/${e}` : "/", req.url);
  const res = NextResponse.redirect(to);
  if (CODE_RE.test(c)) res.cookies.set("pr", c, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}
