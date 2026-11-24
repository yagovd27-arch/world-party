import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 1) clubs.<dominio> sirve el panel de clubs (/club) como web aparte.
 * 2) Refresca la sesión de Supabase para que el login no caduque.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const path = request.nextUrl.pathname;
  const shared = ["/club", "/api", "/auth", "/e/", "/t/", "/c/", "/pagar/", "/p/", "/terms", "/privacy", "/refunds", "/contact"];
  const clubsHost = host.startsWith("clubs.") && !shared.some((p) => path.startsWith(p));
  const url = request.nextUrl.clone();
  if (clubsHost) url.pathname = path === "/" ? "/club" : `/club${path}`;
  const next = () => (clubsHost ? NextResponse.rewrite(url, { request }) : NextResponse.next({ request }));

  let response = next();
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSession || !supaUrl || !supaKey) return response;

  const sb = createServerClient(supaUrl, supaKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
