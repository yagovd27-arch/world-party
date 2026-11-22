import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  const res = NextResponse.redirect(new URL("/club", request.url));
  res.cookies.delete("club");
  return res;
}
