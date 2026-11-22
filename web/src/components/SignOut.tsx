"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "./LangProvider";

export default function SignOut({ to = "/" }: { to?: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <button
      className="cta ghost block"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.replace(to);
        router.refresh();
      }}
    >
      {t.login.signOut}
    </button>
  );
}
