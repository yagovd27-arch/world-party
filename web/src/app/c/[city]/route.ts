import { NextResponse } from "next/server";

/** Guarda la ciudad elegida y vuelve a la lista de eventos. */
export async function GET(request: Request, { params }: RouteContext<"/c/[city]">) {
  const { city } = await params;
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set("city", city, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
