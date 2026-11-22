"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOut({ to = "/" }: { to?: string }) {
  const router = useRouter();
  return (
    <button
      className="cta ghost block"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.replace(to);
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
